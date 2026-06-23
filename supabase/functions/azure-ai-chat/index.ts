// Azure AI Chat proxy with shared deployment resolution.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { callAzureOpenAIChat } from '../_shared/azure-config.ts';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
    if (claimErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as ChatRequest;
    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: 'messages array required' }, 400);
    }

    const operation = (body.task || 'chat').toString().slice(0, 64);
    const modelHint = body.model || body.deployment || 'default';
    const started = await startLog({ userId, operation, model: `azure:${modelHint}` });
    logId = started.id;
    startedAt = started.startedAt;
    await markRunning(logId);

    const { response, body: upstreamBody, config } = await callAzureOpenAIChat({
      model: body.model,
      deployment: body.deployment,
      apiVersion: body.api_version,
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.max_tokens,
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
      model: body.model || config.deployment,
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

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
