// Azure Document Intelligence via APIM — prebuilt-read / prebuilt-layout
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildApimUrl, requireApimSubscriptionKey } from '../_shared/azure-config.ts';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const API_VER = '2024-11-30';

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
      fileUrl?: string;
      fileBase64?: string;
      model?: string;
    };
    if (!body.fileUrl && !body.fileBase64) return json({ error: 'fileUrl or fileBase64 required' }, 400);

    // Server-side allowlist for model
    const ALLOWED_MODELS = ['prebuilt-read', 'prebuilt-layout', 'prebuilt-document'];
    const model = ALLOWED_MODELS.includes(body.model || '') ? body.model! : 'prebuilt-read';

    // Validate fileUrl: must be https
    if (body.fileUrl) {
      try {
        const u = new URL(body.fileUrl);
        if (u.protocol !== 'https:') return json({ error: 'fileUrl must be https' }, 400);
        // Block private/local hosts
        const host = u.hostname.toLowerCase();
        if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|::1)/.test(host) || host.endsWith('.internal') || host.endsWith('.local')) {
          return json({ error: 'fileUrl host not allowed' }, 400);
        }
      } catch {
        return json({ error: 'Invalid fileUrl' }, 400);
      }
    }

    const started = await startLog({ userId, operation: 'docint', model: `azab-docint:${model}` });
    logId = started.id; startedAt = started.startedAt;

    const analyzeUrl = buildApimUrl(`/azab-docint/documentintelligence/documentModels/${model}:analyze?api-version=${API_VER}`);

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
      const msg = `Submit failed: HTTP ${submit.status}`;
      await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg });
      return json({ error: msg, details: t }, 502);
    }
    const opLocation = submit.headers.get('operation-location');
    if (!opLocation) {
      await finishLog(logId, { startedAt, status: 'failed', errorMessage: 'Missing operation-location' });
      return json({ error: 'Missing operation-location' }, 502);
    }

    await markRunning(logId);

    const deadline = Date.now() + 50_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await fetch(opLocation, { headers: { 'Ocp-Apim-Subscription-Key': apimKey } });
      const data = await poll.json();
      if (data.status === 'succeeded') {
        const content = data?.analyzeResult?.content || '';
        const pages = data?.analyzeResult?.pages?.length || 0;
        const summary = `model: ${model} | pages: ${pages} | chars: ${content.length}`;
        await finishLog(logId, { startedAt, status: 'succeeded', summary });
        return json({ content, pages, raw: data.analyzeResult });
      }
      if (data.status === 'failed') {
        await finishLog(logId, { startedAt, status: 'failed', errorMessage: 'Analysis failed' });
        return json({ error: 'Analysis failed', details: data }, 500);
      }
    }
    await finishLog(logId, { startedAt, status: 'failed', errorMessage: 'Timeout' });
    return json({ error: 'Timeout waiting for analysis' }, 504);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg });
    return json({ error: msg }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
