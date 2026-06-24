// Architectural image analyzer — uses Azure OpenAI vision (multimodal chat completions).
// Returns structured JSON: style, colors, finish_elements, architectural_objects, quality, notes.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  imageBase64: string; // data URL or raw base64
  mimeType?: string;
  notes?: string;
  language?: 'ar' | 'en';
}

const SYSTEM_PROMPT_AR = `أنت خبير معماري ومحلل تصميم داخلي. حلّل الصورة المعطاة بصرياً (وليس نصياً) وأرجِع JSON صالحاً فقط بدون أي شرح إضافي ودون أسوار كود، بهذا الشكل:
{
  "style": "النمط العام (حديث | كلاسيكي | عربي | أوروبي | صناعي | ريفي | مختلط)",
  "style_confidence": 0-100,
  "dominant_colors": ["لون1","لون2","لون3"],
  "color_harmony": "وصف قصير لتناغم الألوان",
  "finish_elements": ["رخام","خشب","سيراميك","جبس", "..."],
  "architectural_objects": ["أبواب","نوافذ","أعمدة","قناطر","..."],
  "quality_rating": 1-5,
  "quality_label": "ممتاز | جيد جداً | جيد | يحتاج تحسين",
  "notes": "ملاحظات إضافية موجزة (سطرين كحد أقصى)",
  "summary": "وصف معماري عام في جملة واحدة"
}
إذا لم تكن الصورة معمارية، أعد JSON بنفس الحقول مع style="غير معماري" و quality_rating=0.`;

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
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
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
    if (!body?.imageBase64) return json({ error: 'imageBase64 required' }, 400);

    // Normalize to data URL
    const dataUrl = body.imageBase64.startsWith('data:')
      ? body.imageBase64
      : `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}`;

    // Size guard (~ 8MB base64)
    if (dataUrl.length > 12_000_000) return json({ error: 'Image too large (max ~8MB)' }, 400);

    const operation = 'architecture-analyze';
    const started = await startLog({ userId, operation, model: `azure:${deployment}` });
    logId = started.id;
    startedAt = started.startedAt;
    await markRunning(logId);

    const userText = body.notes?.trim()
      ? `حلّل هذه الصورة معمارياً. ملاحظات المستخدم: ${body.notes.slice(0, 500)}`
      : 'حلّل هذه الصورة معمارياً وأرجِع JSON فقط حسب الصيغة المطلوبة.';

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_AR },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
    });

    const text = await res.text();
    let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    const usage = parsed?.usage ?? {};
    const content: string = parsed?.choices?.[0]?.message?.content ?? '';

    if (!res.ok) {
      const errMsg = parsed?.error?.message || `HTTP ${res.status}`;
      await finishLog(logId, {
        startedAt, status: 'failed', errorMessage: errMsg,
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
      });
      return json({ error: errMsg, upstream_status: res.status }, 502);
    }

    let analysis: any = null;
    try { analysis = JSON.parse(content); } catch {
      // try extract JSON block
      const m = content.match(/\{[\s\S]*\}/);
      if (m) try { analysis = JSON.parse(m[0]); } catch { /* noop */ }
    }
    if (!analysis) analysis = { summary: content, raw: true };

    const summary = analysis?.summary?.slice?.(0, 160) || `style: ${analysis?.style ?? 'n/a'}`;
    await finishLog(logId, {
      startedAt, status: 'succeeded', summary,
      promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
    });

    return json({ analysis, usage, latency_ms: Date.now() - startedAt, log_id: logId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (logId) { try { await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg }); } catch { /* ignore */ } }
    return json({ error: msg }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
