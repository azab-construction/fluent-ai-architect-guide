// Azure AI Vision via APIM — OCR (Read) + image analysis
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildApimUrl, requireApimSubscriptionKey } from '../_shared/azure-config.ts';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const apimKey = requireApimSubscriptionKey();

    const body = await req.json() as {
      imageUrl?: string;
      imageBase64?: string;
      features?: string;
    };
    if (!body.imageUrl && !body.imageBase64) return json({ error: 'imageUrl or imageBase64 required' }, 400);

    // Validate imageUrl: https only, block private/local hosts
    if (body.imageUrl) {
      try {
        const u = new URL(body.imageUrl);
        if (u.protocol !== 'https:') return json({ error: 'imageUrl must be https' }, 400);
        const host = u.hostname.toLowerCase();
        if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|::1)/.test(host) || host.endsWith('.internal') || host.endsWith('.local')) {
          return json({ error: 'imageUrl host not allowed' }, 400);
        }
      } catch {
        return json({ error: 'Invalid imageUrl' }, 400);
      }
    }

    // Validate features: allowlist
    const ALLOWED_FEATURES = new Set(['read', 'caption', 'denseCaptions', 'tags', 'objects', 'smartCrops', 'people']);
    const requestedFeatures = (body.features || 'read').split(',').map(s => s.trim()).filter(Boolean);
    if (requestedFeatures.some(f => !ALLOWED_FEATURES.has(f))) {
      return json({ error: 'Invalid features' }, 400);
    }
    const features = requestedFeatures.join(',');

    const started = await startLog({ userId, operation: 'vision', model: `azab-vision:${features}` });
    logId = started.id; startedAt = started.startedAt;
    await markRunning(logId);

    const url = buildApimUrl(`/azab-vision/computervision/imageanalysis:analyze?api-version=2024-02-01&features=${encodeURIComponent(features)}`);

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
    if (!upstream.ok) {
      const msg = data?.error?.message || `HTTP ${upstream.status}`;
      await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg });
      return json({ error: msg, details: data }, upstream.status);
    }

    const readBlocks = data?.readResult?.blocks || [];
    const extractedText = readBlocks
      .flatMap((b: any) => b.lines?.map((l: any) => l.text) || [])
      .join('\n');
    const caption = data?.captionResult?.text;
    const tags = data?.tagsResult?.values?.map((t: any) => t.name);

    const summary = [
      caption ? `caption: ${caption}` : null,
      `chars: ${extractedText.length}`,
      `lines: ${readBlocks.reduce((n: number, b: any) => n + (b.lines?.length || 0), 0)}`,
      tags?.length ? `tags: ${tags.slice(0, 5).join(', ')}` : null,
    ].filter(Boolean).join(' | ');

    await finishLog(logId, { startedAt, status: 'succeeded', summary });

    return json({ text: extractedText, caption, tags, raw: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg });
    return json({ error: msg }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
