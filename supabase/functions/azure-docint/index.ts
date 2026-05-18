// Azure Document Intelligence via APIM — prebuilt-read / prebuilt-layout
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIM_BASE = 'https://azabai.azure-api.net';
const API_VER = '2024-11-30';

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
      fileUrl?: string;
      fileBase64?: string;
      model?: 'prebuilt-read' | 'prebuilt-layout' | 'prebuilt-document';
    };
    if (!body.fileUrl && !body.fileBase64) return json({ error: 'fileUrl or fileBase64 required' }, 400);

    const model = body.model || 'prebuilt-read';
    const analyzeUrl = `${APIM_BASE}/azab-docint/documentintelligence/documentModels/${model}:analyze?api-version=${API_VER}`;

    let submit: Response;
    if (body.fileUrl) {
      submit = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': apimKey },
        body: JSON.stringify({ urlSource: body.fileUrl }),
      });
    } else {
      const bytes = Uint8Array.from(atob(body.fileBase64!.replace(/^data:[^;]+;base64,/, '')), c => c.charCodeAt(0));
      submit = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'Ocp-Apim-Subscription-Key': apimKey },
        body: bytes,
      });
    }

    if (submit.status !== 202) {
      const t = await submit.text();
      return json({ error: `Submit failed: HTTP ${submit.status}`, details: t }, 502);
    }
    const opLocation = submit.headers.get('operation-location');
    if (!opLocation) return json({ error: 'Missing operation-location' }, 502);

    // Poll
    const deadline = Date.now() + 50_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await fetch(opLocation, { headers: { 'Ocp-Apim-Subscription-Key': apimKey } });
      const data = await poll.json();
      if (data.status === 'succeeded') {
        const content = data?.analyzeResult?.content || '';
        const pages = data?.analyzeResult?.pages?.length || 0;
        return json({ content, pages, raw: data.analyzeResult });
      }
      if (data.status === 'failed') return json({ error: 'Analysis failed', details: data }, 500);
    }
    return json({ error: 'Timeout waiting for analysis' }, 504);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
