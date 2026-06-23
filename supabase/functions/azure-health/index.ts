// Health-check for Azure services: pings configured endpoints and returns latency + status.
import { buildApimUrl, getApimSubscriptionKey, readAzureOpenAIConfig, buildAzureOpenAIChatUrl } from '../_shared/azure-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Check {
  service: string;
  configured: boolean;
  ok: boolean;
  status?: number;
  latency_ms?: number;
  message?: string;
  details?: Record<string, unknown>;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: unknown; ms: number }> {
  const t = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - t };
  } catch (error) {
    return { error, ms: Date.now() - t };
  }
}

async function checkAzureOpenAI(): Promise<Check> {
  const resolved = readAzureOpenAIConfig();
  if (!resolved.configured || !resolved.config) {
    return { service: 'azure-openai', configured: false, ok: false, message: `Missing: ${resolved.missing.join(', ')}` };
  }

  const config = resolved.config;
  const url = buildAzureOpenAIChatUrl(config);
  const { value, error, ms } = await timed(() => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      temperature: 0,
    }),
  }));
  if (error) return { service: 'azure-openai', configured: true, ok: false, latency_ms: ms, message: String(error) };
  const res = value!;
  let bodyText = '';
  try { bodyText = await res.text(); } catch { /* ignore */ }
  return {
    service: 'azure-openai',
    configured: true,
    ok: res.ok,
    status: res.status,
    latency_ms: ms,
    message: res.ok ? 'الاتصال نشط' : bodyText.slice(0, 200),
    details: { deployment: config.deployment, apiVersion: config.apiVersion },
  };
}

async function checkApim(service: string, path: string): Promise<Check> {
  const apimKey = getApimSubscriptionKey();
  if (!apimKey) {
    return { service, configured: false, ok: false, message: 'AZURE_APIM_SUBSCRIPTION_KEY غير مهيأ' };
  }
  const url = buildApimUrl(path);
  const { value, error, ms } = await timed(() => fetch(url, {
    method: 'OPTIONS',
    headers: { 'Ocp-Apim-Subscription-Key': apimKey },
  }));
  if (error) return { service, configured: true, ok: false, latency_ms: ms, message: String(error) };
  const res = value!;
  return {
    service,
    configured: true,
    ok: res.status < 500,
    status: res.status,
    latency_ms: ms,
    message: res.status < 500 ? 'البوابة قابلة للوصول' : `HTTP ${res.status}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const [openai, docint, vision, search] = await Promise.all([
      checkAzureOpenAI(),
      checkApim('document-intelligence', '/docint/'),
      checkApim('vision-ocr', '/vision/'),
      checkApim('cognitive-search', '/search/'),
    ]);
    const checks = [openai, docint, vision, search];
    const summary = {
      total: checks.length,
      ok: checks.filter(c => c.ok).length,
      configured: checks.filter(c => c.configured).length,
    };
    return json({ checks, summary, timestamp: new Date().toISOString() });
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
