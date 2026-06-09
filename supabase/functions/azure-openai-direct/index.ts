// Direct Azure OpenAI proxy using AZURE_OPENAI_* secrets configured in edge env.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
interface Body {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  task?: string; // optional label for usage logs
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
    if (claimErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const apiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const deployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
    const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview';
    if (!apiKey || !endpoint || !deployment) {
      return json({ error: 'Azure OpenAI secrets not configured' }, 500);
    }

    const body = (await req.json()) as Body;
    if (!body?.messages?.length) return json({ error: 'messages required' }, 400);

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const start = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 1200,
      }),
    });
    const latency = Date.now() - start;
    const text = await res.text();
    let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const usage = parsed?.usage ?? {};
    await adminClient.from('ai_usage_logs').insert({
      user_id: userId,
      model: `azure:${deployment}${body.task ? `:${body.task}` : ''}`,
      prompt_tokens: usage.prompt_tokens ?? null,
      completion_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
      latency_ms: latency,
      status: res.ok ? 'success' : 'error',
      error_message: res.ok ? null : (parsed?.error?.message || `HTTP ${res.status}`),
    });

    if (!res.ok) {
      return json({ error: parsed?.error?.message || `HTTP ${res.status}`, upstream_status: res.status }, 502);
    }
    const content = parsed?.choices?.[0]?.message?.content ?? '';
    return json({ content, usage, latency_ms: latency });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
