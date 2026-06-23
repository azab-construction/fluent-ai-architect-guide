// Quick health-check for Azure services: pings each configured endpoint and
// returns latency + ok status. No auth required (read-only diagnostics).
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
  const apiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
  const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
  const deployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
  const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview';
  if (!apiKey || !endpoint || !deployment) {
    return { service: 'azure-openai', configured: false, ok: false, message: 'الإعدادات غير مكتملة' };
  }
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const { value, error, ms } = await timed(() => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      temperature: 0,
    }),
  }));
  if (error) return { service: 'azure-openai', configured: true, ok: false, latency_ms: ms, message: String(error) };
  const res = value!;
  let bodyText = '';
  try { bodyText = await res.text(); } catch { /* */ }
  return {
    service: 'azure-openai',
    configured: true,
    ok: res.ok,
    status: res.status,
    latency_ms: ms,
    message: res.ok ? 'الاتصال نشط' : bodyText.slice(0, 200),
    details: { deployment, apiVersion },
  };
}

async function checkApim(service: string, path: string): Promise<Check> {
  const apimKey = Deno.env.get('ALAZAB_AI_PROD_KEY');
  if (!apimKey) {
    return { service, configured: false, ok: false, message: 'ALAZAB_AI_PROD_KEY غير مهيأ' };
  }
  // Health probe via OPTIONS to APIM gateway (lightweight, returns 200/204 when reachable)
  const url = `https://alazab-ai-prod.azure-api.net${path}`;
  const { value, error, ms } = await timed(() => fetch(url, {
    method: 'OPTIONS',
    headers: { 'Ocp-Apim-Subscription-Key': apimKey },
  }));
  if (error) return { service, configured: true, ok: false, latency_ms: ms, message: String(error) };
  const res = value!;
  // APIM returns 200/204 on OPTIONS even without policy match; treat <500 as reachable
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
    return new Response(JSON.stringify({ checks, summary, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
