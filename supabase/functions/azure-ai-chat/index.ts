// Azure APIM AI Chat proxy — routes to azab-openai (gpt-5) or aicu-openai (gpt-4.1)
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIM_BASE = 'https://azabai.azure-api.net';

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
interface ChatRequest {
  model?: 'gpt-5' | 'gpt-4.1';
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
    if (claimErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const apimKey = Deno.env.get('ALAZAB_AI_PROD_KEY');
    if (!apimKey) return json({ error: 'ALAZAB_AI_PROD_KEY not configured' }, 500);

    const body = (await req.json()) as ChatRequest;
    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: 'messages array required' }, 400);
    }
    const model = body.model === 'gpt-4.1' ? 'gpt-4.1' : 'gpt-5';

    // Route + header by model
    const route = model === 'gpt-5' ? '/azab-openai/openai/v1/chat/completions'
                                    : '/aicu-openai/openai/v1/chat/completions';
    const headerName = model === 'gpt-5' ? 'api-key' : 'Ocp-Apim-Subscription-Key';
    const url = `${APIM_BASE}${route}`;

    const payload: Record<string, unknown> = {
      model,
      messages: body.messages,
    };
    if (typeof body.temperature === 'number') payload.temperature = body.temperature;
    if (typeof body.max_tokens === 'number') payload.max_tokens = body.max_tokens;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const start = Date.now();
    let upstreamStatus = 0;
    let upstreamBody: any = null;
    let errMsg: string | null = null;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [headerName]: apimKey },
        body: JSON.stringify(payload),
      });
      upstreamStatus = res.status;
      const text = await res.text();
      try { upstreamBody = JSON.parse(text); } catch { upstreamBody = { raw: text }; }
      if (!res.ok) errMsg = upstreamBody?.error?.message || `HTTP ${res.status}`;
    } catch (e) {
      errMsg = e instanceof Error ? e.message : 'network error';
    }

    const latency = Date.now() - start;
    const usage = upstreamBody?.usage ?? {};

    await adminClient.from('ai_usage_logs').insert({
      user_id: userId,
      model,
      prompt_tokens: usage.prompt_tokens ?? null,
      completion_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
      latency_ms: latency,
      status: errMsg ? 'error' : 'success',
      error_message: errMsg,
    });

    if (errMsg) {
      const status = upstreamStatus === 429 ? 429 : upstreamStatus === 402 ? 402 : 502;
      return json({ error: errMsg, upstream_status: upstreamStatus }, status);
    }

    const content = upstreamBody?.choices?.[0]?.message?.content ?? '';
    return json({ content, model, usage, latency_ms: latency }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return json({ error: msg }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
