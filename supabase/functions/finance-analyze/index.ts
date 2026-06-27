// Financial analysis via the shared Azure AI chat runtime.
// Returns structured JSON (income statement, balance sheet, cash flow, KPIs,
// alerts, Mermaid charts, narrative report).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';
import { callAzureOpenAIChat } from '../_shared/azure-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `أنت محلل مالي محترف ومراجع حسابات خبير داخل سياق az-finance / gpt-5.1. مهمتك تحليل البيانات المالية الواردة من ملفات (Excel/CSV/PDF/SQL) وإنتاج تقرير مالي متكامل.

قواعد صارمة:
1. أرجع JSON صالحاً فقط بدون أي شرح خارج JSON.
2. كل القيم النقدية أرقام (Number) بدون فواصل أو رموز عملة.
3. استخدم اللغة العربية في كل النصوص الوصفية.
4. إذا كانت البيانات غير كافية اذكر ذلك في "alerts" واملأ الباقي بأفضل تقدير منطقي.
5. مخططات Mermaid يجب أن تكون صالحة syntactically.

البنية المطلوبة بدقة:
{
  "summary": "ملخص تنفيذي 3-5 أسطر",
  "period": "الفترة المالية المُحلَّلة",
  "currency": "العملة المكتشفة",
  "income_statement": {
    "revenue":  [{"name":"بند","amount":0}],
    "expenses": [{"name":"بند","amount":0}],
    "gross_profit": 0,
    "operating_profit": 0,
    "net_income": 0
  },
  "balance_sheet": {
    "assets":      [{"name":"بند","amount":0}],
    "liabilities": [{"name":"بند","amount":0}],
    "equity":      [{"name":"بند","amount":0}],
    "total_assets": 0,
    "total_liabilities_equity": 0
  },
  "cash_flow": {
    "operating": 0,
    "investing": 0,
    "financing": 0,
    "net_change": 0
  },
  "kpis": [
    {"name":"هامش الربح الصافي","value":"0%","trend":"up|down|flat","note":""}
  ],
  "alerts": ["تنبيهات وشذوذ"],
  "recommendations": ["توصيات عملية"],
  "charts": {
    "expenses_pie": "pie showData\n  title توزيع المصاريف\n  \"البند\" : 100",
    "revenue_bar":  "xychart-beta\n  title الإيرادات\n  x-axis [يناير, فبراير]\n  y-axis \"المبلغ\" 0 --> 1000\n  bar [500, 700]",
    "flow":         "flowchart LR\n  A[الإيرادات] --> B[تكاليف] --> C[ربح]"
  },
  "narrative_report_ar": "تقرير سردي تفصيلي 200-400 كلمة"
}`;

interface Body {
  files: Array<{ name: string; type: string; content: string }>;
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

    const body = (await req.json()) as Body;
    if (!body?.files?.length) return json({ error: 'files required' }, 400);

    const started = await startLog({ userId, operation: 'finance-analyze', model: 'azure:gpt-5.1' });
    logId = started.id;
    startedAt = started.startedAt;
    await markRunning(logId);

    const filesBlock = body.files
      .map((f, i) => `### ملف ${i + 1}: ${f.name} (${f.type})\n${f.content}`)
      .join('\n\n---\n\n');
    const notesBlock = body.notes ? `\n\nملاحظات المستخدم:\n${body.notes}` : '';
    const userContent = `حلّل البيانات المالية التالية وأنتج التقرير المتكامل بصيغة JSON الصارمة المطلوبة:\n\n${filesBlock}${notesBlock}`;

    const result = await callAzureOpenAIChat({
      model: 'gpt-5.1',
      deployment: 'az-finance',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      maxTokens: 4000,
    });

    let report: any = null;
    try { report = JSON.parse(result.content); } catch { /* keep raw */ }

    await finishLog(logId, {
      startedAt,
      status: 'succeeded',
      summary: report?.summary?.slice(0, 160) || 'تقرير مالي',
      promptTokens: result.usage?.prompt_tokens,
      completionTokens: result.usage?.completion_tokens,
      totalTokens: result.usage?.total_tokens,
    });

    return json({
      report,
      raw: result.content,
      usage: result.usage,
      latency_ms: Date.now() - startedAt,
      log_id: logId,
      deployment: result.deployment,
      api_version: result.apiVersion,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (logId) {
      try { await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg }); } catch { /* ignore */ }
    }
    return json({ error: msg }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
