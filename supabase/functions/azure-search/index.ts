// Azure Cognitive Search via APIM
import { createClient } from 'npm:@supabase/supabase-js@2';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIM_BASE = 'https://azabai.azure-api.net';
const API_VER = '2024-07-01';

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
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const apimKey = Deno.env.get('ALAZAB_AI_PROD_KEY');
    if (!apimKey) return json({ error: 'ALAZAB_AI_PROD_KEY not configured' }, 500);

    const body = await req.json() as {
      index: string;
      query: string;
      top?: number;
      filter?: string;
      select?: string;
    };
    if (!body.index || !body.query) return json({ error: 'index and query required' }, 400);

    const started = await startLog({ userId, operation: 'search', model: `azab-cognitivesearch:${body.index}` });
    logId = started.id; startedAt = started.startedAt;
    await markRunning(logId);

    const url = `${APIM_BASE}/azab-cognitivesearch/indexes/${encodeURIComponent(body.index)}/docs/search?api-version=${API_VER}`;
    const payload: Record<string, unknown> = {
      search: body.query,
      top: body.top ?? 5,
      queryType: 'simple',
    };
    if (body.filter) payload.filter = body.filter;
    if (body.select) payload.select = body.select;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': apimKey },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg });
      return json({ error: msg, details: data }, res.status);
    }

    const count = data['@odata.count'] ?? data.value?.length ?? 0;
    const q = body.query.length > 60 ? body.query.slice(0, 60) + '…' : body.query;
    const summary = `index: ${body.index} | q: "${q}" | hits: ${count}`;
    await finishLog(logId, { startedAt, status: 'succeeded', summary });

    return json({ count, results: data.value || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg });
    return json({ error: msg }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
