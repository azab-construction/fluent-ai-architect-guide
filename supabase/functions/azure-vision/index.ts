// Azure AI Vision via APIM — OCR (Read) + image analysis
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIM_BASE = 'https://azabai.azure-api.net';

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
      imageUrl?: string;
      imageBase64?: string;
      features?: string; // e.g. "read", "caption,read,tags"
    };
    if (!body.imageUrl && !body.imageBase64) return json({ error: 'imageUrl or imageBase64 required' }, 400);

    const features = body.features || 'read';
    const url = `${APIM_BASE}/azab-vision/computervision/imageanalysis:analyze?api-version=2024-02-01&features=${encodeURIComponent(features)}`;

    let upstream: Response;
    if (body.imageUrl) {
      upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': apimKey },
        body: JSON.stringify({ url: body.imageUrl }),
      });
    } else {
      const bytes = Uint8Array.from(atob(body.imageBase64!.replace(/^data:[^;]+;base64,/, '')), c => c.charCodeAt(0));
      upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'Ocp-Apim-Subscription-Key': apimKey },
        body: bytes,
      });
    }

    const text = await upstream.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) return json({ error: data?.error?.message || `HTTP ${upstream.status}`, details: data }, upstream.status);

    // Extract plain text from read result
    const readBlocks = data?.readResult?.blocks || [];
    const extractedText = readBlocks
      .flatMap((b: any) => b.lines?.map((l: any) => l.text) || [])
      .join('\n');

    return json({
      text: extractedText,
      caption: data?.captionResult?.text,
      tags: data?.tagsResult?.values?.map((t: any) => t.name),
      raw: data,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
