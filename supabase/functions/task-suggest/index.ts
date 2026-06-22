// AI task suggestions for a project — returns Arabic task list as JSON.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { startLog, markRunning, finishLog } from '../_shared/usage-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `أنت مدير مشاريع محترف. اقترح قائمة مهام عملية وقابلة للتنفيذ للمشروع المُعطى.
أرجع JSON صالحاً فقط بهذه البنية:
{ "tasks": [ { "title": "عنوان قصير", "description": "وصف مختصر", "priority": "low|medium|high|urgent", "estimated_days": 1 } ] }
قواعد: 5 إلى 10 مهام، بالعربية، عناوين فعلية (افعل/أنشئ/راجع...).`;

interface Body {
  project_name: string;
  project_description?: string;
  existing_titles?: string[];
  count?: number;
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
    if (!body?.project_name) return json({ error: 'project_name required' }, 400);

    const modelLabel = `azure:${deployment}`;
    const started = await startLog({ userId, operation: 'task-suggest', model: modelLabel });
    logId = started.id; startedAt = started.startedAt;
    await markRunning(logId);

    const userContent = `المشروع: ${body.project_name}
${body.project_description ? `الوصف: ${body.project_description}` : ''}
${body.existing_titles?.length ? `مهام موجودة (لا تكرّرها):\n${body.existing_titles.map(t => '- ' + t).join('\n')}` : ''}
اقترح ${body.count || 7} مهام جديدة.`;

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.6,
        max_tokens: 1500,
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
        startedAt, status: 'failed', summary: body.project_name.slice(0, 160), errorMessage: errMsg,
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
      });
      return json({ error: errMsg, upstream_status: res.status }, 502);
    }

    let result: any = { tasks: [] };
    try { result = JSON.parse(content); } catch { /* keep empty */ }

    await finishLog(logId, {
      startedAt, status: 'succeeded',
      summary: `${result?.tasks?.length || 0} مهام لـ ${body.project_name}`.slice(0, 160),
      promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
    });

    return json({ tasks: result.tasks || [], raw: content, usage, latency_ms: Date.now() - startedAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (logId) { try { await finishLog(logId, { startedAt, status: 'failed', errorMessage: msg }); } catch { /* ignore */ } }
    return json({ error: msg }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
