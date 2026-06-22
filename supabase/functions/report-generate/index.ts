// Smart report generator — pulls data from Supabase (or accepts inline data),
// returns structured JSON with KPIs, Mermaid charts, and recommendations.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `أنت محلل أعمال خبير في إعداد التقارير التنفيذية والتشغيلية والتحليلية.
أرجع JSON صالحاً فقط بهذه البنية:
{
  "title": "عنوان التقرير",
  "executive_summary": "ملخص تنفيذي 4-6 أسطر",
  "key_findings": ["نقطة 1", "نقطة 2"],
  "kpis": [{"name":"اسم","value":"قيمة","trend":"up|down|flat","note":""}],
  "sections": [{"heading":"عنوان","content":"شرح فقرة"}],
  "recommendations": ["توصية"],
  "charts": {
    "primary":  "pie showData\\n  title عنوان\\n  \\"بند\\" : 100",
    "trend":    "xychart-beta\\n  title اتجاه\\n  x-axis [a,b]\\n  y-axis \\"\\" 0 --> 100\\n  line [10,20]",
    "flow":     "flowchart LR\\n  A --> B"
  }
}
قواعد: استخدم العربية، أرقام بدون فواصل، مخططات Mermaid صالحة.`;

interface Body {
  type: 'executive' | 'operational' | 'analytical';
  source: 'finance' | 'whatsapp' | 'architecture' | 'tasks' | 'custom';
  title: string;
  period_days?: number;
  custom_data?: string;
  notes?: string;
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
    if (!apiKey || !endpoint || !deployment) return json({ error: 'Azure OpenAI secrets not configured' }, 500);

    const body = (await req.json()) as Body;
    if (!body?.type || !body?.source || !body?.title) return json({ error: 'type, source, title required' }, 400);

    const modelLabel = `azure:${deployment}`;
    const started = await startLog({ userId, operation: 'report-generate', model: modelLabel });
    logId = started.id; startedAt = started.startedAt;
    await markRunning(logId);

    // Pull data from Supabase based on source
    const days = body.period_days || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let dataBlock = '';

    if (body.source === 'finance') {
      const { data } = await supabase
        .from('ai_usage_logs').select('operation,total_tokens,created_at,status,summary')
        .eq('operation', 'finance-analyze').gte('created_at', since).limit(50);
      dataBlock = `سجل التحليلات المالية (${data?.length || 0} عملية):\n${JSON.stringify(data || [], null, 2)}`;
    } else if (body.source === 'whatsapp') {
      const { data } = await supabase
        .from('whatsapp_messages').select('from_number,message_type,timestamp,text_body')
        .gte('timestamp', since).limit(200);
      dataBlock = `رسائل واتساب (${data?.length || 0}):\n${JSON.stringify(data || [], null, 2).slice(0, 30000)}`;
    } else if (body.source === 'architecture') {
      const { data } = await supabase
        .from('ai_usage_logs').select('operation,total_tokens,created_at,summary')
        .eq('operation', 'architecture-analyze').gte('created_at', since).limit(100);
      dataBlock = `تحليلات معمارية (${data?.length || 0}):\n${JSON.stringify(data || [], null, 2)}`;
    } else if (body.source === 'tasks') {
      const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).limit(200);
      const { data: projects } = await supabase.from('projects').select('*').eq('user_id', userId).limit(50);
      dataBlock = `المشاريع (${projects?.length || 0}):\n${JSON.stringify(projects || [], null, 2)}\n\nالمهام (${tasks?.length || 0}):\n${JSON.stringify(tasks || [], null, 2)}`;
    } else if (body.source === 'custom') {
      dataBlock = body.custom_data || '(لا توجد بيانات مخصصة)';
    }

    dataBlock = dataBlock.slice(0, 50000);

    const userContent = `نوع التقرير: ${body.type}
المصدر: ${body.source}
العنوان المقترح: ${body.title}
الفترة: آخر ${days} يوم
${body.notes ? `ملاحظات: ${body.notes}\n` : ''}
البيانات:
${dataBlock}

أنتج التقرير بصيغة JSON المطلوبة بدقة.`;

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 4000,
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
        startedAt, status: 'failed', summary: body.title.slice(0, 160), errorMessage: errMsg,
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
      });
      return json({ error: errMsg, upstream_status: res.status }, 502);
    }

    let report: any = null;
    try { report = JSON.parse(content); } catch { /* keep raw */ }

    await finishLog(logId, {
      startedAt, status: 'succeeded',
      summary: report?.executive_summary?.slice(0, 160) || body.title,
      promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
    });

    return json({ report, raw: content, usage, latency_ms: Date.now() - startedAt, log_id: logId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (logId) { try { await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg }); } catch { /* ignore */ } }
    return json({ error: msg }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
