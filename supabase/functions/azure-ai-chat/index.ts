// Azure AI Chat proxy with shared deployment resolution.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { callAzureOpenAIChat } from '../_shared/azure-config.ts';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_MODELS = new Set(['gpt-5.5', 'gpt-5.1', 'gpt-4.1', 'gpt-4o']);
const ALLOWED_DEPLOYMENTS = new Set(['gpt-5.5', 'az-finance', 'gpt-4.1', 'gpt-4o']);
const ADMIN_TASK_PREFIXES = ['finance-', 'finance:', 'finance_', 'contract-', 'report-', 'architecture-'];
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 12000;
const DEFAULT_MAX_TOKENS = 1200;
const HARD_MAX_TOKENS = 4000;

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
interface ChatRequest {
  model?: string;
  deployment?: string;
  api_version?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  task?: string;
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeTask(value: unknown): string {
  return String(value || 'chat').replace(/[^A-Za-z0-9:_-]/g, '').slice(0, 64) || 'chat';
}

function requiresAdmin(task: string): boolean {
  return ADMIN_TASK_PREFIXES.some(prefix => task.startsWith(prefix));
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(0, MAX_MESSAGES).map((message) => ({
    role: ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user',
    content: String(message.content || '').slice(0, MAX_MESSAGE_CHARS),
  })).filter(message => message.content.trim().length > 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let logId: string | null = null;
  let startedAt = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
    if (claimErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as ChatRequest;
    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: 'messages array required' }, 400);
    }

    const operation = normalizeTask(body.task);
    if (requiresAdmin(operation)) {
      const { data: isAdmin, error: roleErr } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (roleErr || !isAdmin) return json({ error: 'Forbidden' }, 403);
    }

    const requestedModel = body.model || undefined;
    const requestedDeployment = body.deployment || undefined;
    if (requestedModel && !ALLOWED_MODELS.has(requestedModel)) {
      return json({ error: 'Model is not allowed' }, 400);
    }
    if (requestedDeployment && !ALLOWED_DEPLOYMENTS.has(requestedDeployment)) {
      return json({ error: 'Deployment is not allowed' }, 400);
    }

    const safeMessages = sanitizeMessages(body.messages);
    if (!safeMessages.length) return json({ error: 'messages content required' }, 400);

    const safeMaxTokens = Math.min(
      Math.max(Number(body.max_tokens || DEFAULT_MAX_TOKENS), 1),
      HARD_MAX_TOKENS,
    );
    const safeTemperature = Math.min(Math.max(Number(body.temperature ?? 0.7), 0), 1);

    const modelHint = requestedModel || requestedDeployment || 'default';
    const started = await startLog({ userId, operation, model: `azure:${modelHint}` });
    logId = started.id;
    startedAt = started.startedAt;
    await markRunning(logId);

    const { response, body: upstreamBody, config } = await callAzureOpenAIChat({
      model: requestedModel,
      deployment: requestedDeployment,
      apiVersion: body.api_version,
      messages: safeMessages,
      temperature: safeTemperature,
      maxTokens: safeMaxTokens,
    });

    const usage = upstreamBody?.usage ?? {};
    const content = upstreamBody?.choices?.[0]?.message?.content ?? '';

    if (!response.ok) {
      const errMsg = upstreamBody?.error?.message || `HTTP ${response.status}`;
      await finishLog(logId, {
        startedAt,
        status: 'failed',
        errorMessage: errMsg,
        promptTokens: usage.prompt_tokens ?? null,
        completionTokens: usage.completion_tokens ?? null,
        totalTokens: usage.total_tokens ?? null,
      });
      return json({ error: errMsg, upstream_status: response.status, deployment: config.deployment }, response.status === 429 ? 429 : 502);
    }

    await finishLog(logId, {
      startedAt,
      status: 'succeeded',
      summary: content.slice(0, 160),
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
    });

    return json({
      content,
      model: requestedModel || config.deployment,
      deployment: config.deployment,
      api_version: config.apiVersion,
      usage,
      latency_ms: Date.now() - startedAt,
      log_id: logId,
    }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (logId) { try { await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg }); } catch { /* ignore */ } }
    return json({ error: msg }, 500);
  }
});
