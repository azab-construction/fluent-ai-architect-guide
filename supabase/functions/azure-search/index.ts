// Azure Cognitive Search via APIM
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIM_BASE = 'https://azabai.azure-api.net';
const API_VER = '2024-07-01';

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
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

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
    if (!res.ok) return json({ error: data?.error?.message || `HTTP ${res.status}`, details: data }, res.status);

    return json({
      count: data['@odata.count'] ?? data.value?.length,
      results: data.value || [],
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
