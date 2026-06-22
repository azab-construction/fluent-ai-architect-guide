// Contract & document generator via Azure OpenAI — returns Arabic legal text.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `أنت مستشار قانوني وصياغة عقود محترف باللغة العربية الفصحى.
مهمتك إنشاء مستندات/عقود رسمية كاملة وجاهزة للتوقيع.

قواعد:
1. ابدأ مباشرة بنص العقد بدون مقدمات أو شرح.
2. استخدم بنوداً مرقمة (البند الأول، البند الثاني...).
3. اذكر الأطراف بأسمائهم الكاملة وصفاتهم.
4. أضف بنود: المحل، المدة، الالتزامات، المقابل المالي، فسخ العقد، حل النزاعات، التوقيعات.
5. التزم بالقوانين المعتادة في الدول العربية.
6. إن نقصت بيانات اذكر [يُكمَل لاحقاً] في موضعها.
7. اختم بسطر: "حُرِّر هذا العقد بتاريخ ___ من نسختين، بيد كل طرف نسخة."`;

interface Body {
  template: string;     // employment | contracting | nda | quote | delivery | custom
  title: string;
  parties: Array<{ role: string; name: string; id?: string; address?: string }>;
  fields: Record<string, string | number>;
  extra_clauses?: string;
}

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
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
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
    if (!body?.template || !body?.title) return json({ error: 'template and title required' }, 400);

    const modelLabel = `azure:${deployment}`;
    const started = await startLog({ userId, operation: 'contract-generate', model: modelLabel });
    logId = started.id;
    startedAt = started.startedAt;
    await markRunning(logId);

    const partiesBlock = (body.parties || [])
      .map((p, i) => `- الطرف ${i + 1} (${p.role}): ${p.name}${p.id ? ' — رقم الهوية: ' + p.id : ''}${p.address ? ' — العنوان: ' + p.address : ''}`)
      .join('\n');
    const fieldsBlock = Object.entries(body.fields || {})
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const userContent = `أنشئ المستند التالي:
نوع المستند: ${body.template}
العنوان: ${body.title}

الأطراف:
${partiesBlock || '- (لم تُحدَّد)'}

الحقول والشروط:
${fieldsBlock || '- (افتراضية)'}

${body.extra_clauses ? `بنود إضافية يجب تضمينها:\n${body.extra_clauses}` : ''}

أخرج النص الكامل للمستند بصيغة Markdown منسقة (عناوين، فقرات، قوائم).`;

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 3500,
      }),
    });

    const text = await res.text();
    let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    const usage = parsed?.usage ?? {};
    const content: string = parsed?.choices?.[0]?.message?.content ?? '';

    if (!res.ok) {
      const errMsg = parsed?.error?.message || `HTTP ${res.status}`;
      await finishLog(logId, {
        startedAt, status: 'failed', summary: body.title.slice(0, 160), errorMessage: errMsg,
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
      });
      return json({ error: errMsg, upstream_status: res.status }, 502);
    }

    await finishLog(logId, {
      startedAt, status: 'succeeded', summary: body.title.slice(0, 160),
      promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
    });

    return json({ content, usage, latency_ms: Date.now() - startedAt, log_id: logId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (logId) { try { await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg }); } catch { /* ignore */ } }
    return json({ error: msg }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
