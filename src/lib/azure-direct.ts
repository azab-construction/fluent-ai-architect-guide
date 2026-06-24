import { supabase } from '@/integrations/supabase/client';

export type AzureRole = 'system' | 'user' | 'assistant';
export interface AzureMessage { role: AzureRole; content: string }

/* =========================================================================
 * Unified Azure OpenAI client
 * - Single entry point: callAzureOpenAI
 * - Tool-specific helpers built from declarative TOOL_TEMPLATES
 * - Add a new tool by appending an entry to TOOL_TEMPLATES below
 * ========================================================================= */

export interface AzureCallOptions {
  messages: AzureMessage[];
  temperature?: number;
  maxTokens?: number;
  task?: string;
}

export async function callAzureOpenAI(opts: AzureCallOptions): Promise<string> {
  const { data, error } = await supabase.functions.invoke('azure-openai-direct', {
    body: {
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      task: opts.task,
    },
  });
  if (error) {
    let msg = error.message;
    const ctx = (error as { context?: Response }).context;
    try { if (ctx) { const p = await ctx.clone().json(); if (p?.error) msg = p.error; } } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data?.content || '';
}

/* -------------------------------------------------------------------------
 * Shared base system prompt — appended to every tool
 * ------------------------------------------------------------------------- */
export const BASE_SYSTEM_PROMPT =
  'أنت مساعد محترف يتقن العربية والإنجليزية. التزم بالتعليمات بدقة وقدم نتائج جاهزة للاستخدام دون مقدمات أو اعتذارات.';

/* -------------------------------------------------------------------------
 * Tool templates — single source of truth for system prompts & defaults
 * ------------------------------------------------------------------------- */
export type ToolKey =
  | 'summarize'
  | 'translate'
  | 'rewrite'
  | 'email'
  | 'extract'
  | 'brainstorm';

export interface ToolTemplate {
  /** Tool-specific system prompt (appended after BASE_SYSTEM_PROMPT). */
  system: string;
  /** Builds the user message from raw input + UI options. */
  userPrompt: (input: string, opt: Record<string, string>) => string;
  /** Default sampling parameters. */
  temperature?: number;
  maxTokens?: number;
}

export const TOOL_TEMPLATES: Record<ToolKey, ToolTemplate> = {
  summarize: {
    system: 'مهمتك تلخيص النصوص مع الحفاظ على المعنى الأساسي والمعلومات الجوهرية.',
    userPrompt: (input, o) =>
      `لخّص النص التالي في ${o.style || 'نقاط موجزة'}:\n\n${input}`,
    temperature: 0.3,
    maxTokens: 1200,
  },
  translate: {
    system: 'مهمتك الترجمة الاحترافية مع الحفاظ على المعنى، الأسلوب، والمصطلحات التقنية.',
    userPrompt: (input, o) =>
      `ترجم النص التالي إلى ${o.lang || 'الإنجليزية'} مع الحفاظ على المعنى والأسلوب:\n\n${input}`,
    temperature: 0.2,
    maxTokens: 2000,
  },
  rewrite: {
    system: 'مهمتك إعادة صياغة النصوص لتكون أوضح وأكثر تأثيراً مع الحفاظ على المعنى الأصلي.',
    userPrompt: (input, o) =>
      `أعد صياغة النص التالي بنبرة ${o.tone || 'احترافية'} وبشكل أوضح وأقصر:\n\n${input}`,
    temperature: 0.6,
    maxTokens: 1500,
  },
  email: {
    system: 'مهمتك كتابة رسائل بريد إلكتروني احترافية ومقنعة بصياغة ملائمة للسياق.',
    userPrompt: (input, o) =>
      `اكتب بريداً إلكترونياً ${o.tone || 'احترافياً'} باللغة ${o.lang || 'العربية'} حول الموضوع التالي. ابدأ بسطر "العنوان:" ثم نص الرسالة كاملاً:\n\n${input}`,
    temperature: 0.6,
    maxTokens: 1200,
  },
  extract: {
    system: 'مهمتك استخراج المعلومات المنظمة من النصوص بدقة عالية دون إضافة معلومات غير موجودة.',
    userPrompt: (input) =>
      `استخرج من النص التالي:\n1) المهام\n2) التواريخ والمواعيد\n3) القرارات\n4) المسؤولين\nأرجع النتيجة في قوائم منظمة وواضحة:\n\n${input}`,
    temperature: 0.2,
    maxTokens: 1500,
  },
  brainstorm: {
    system: 'مهمتك توليد أفكار إبداعية ومتنوعة وقابلة للتنفيذ.',
    userPrompt: (input, o) =>
      `قدّم ${o.count || '8'} أفكار إبداعية وقابلة للتنفيذ حول:\n\n${input}`,
    temperature: 0.9,
    maxTokens: 1500,
  },
};

/* -------------------------------------------------------------------------
 * High-level helper — builds messages from a template + runs the call
 * ------------------------------------------------------------------------- */
export function buildToolMessages(
  tool: ToolKey,
  input: string,
  opt: Record<string, string> = {},
): AzureMessage[] {
  const tpl = TOOL_TEMPLATES[tool];
  return [
    { role: 'system', content: `${BASE_SYSTEM_PROMPT}\n\n${tpl.system}` },
    { role: 'user', content: tpl.userPrompt(input, opt) },
  ];
}

export async function runTool(
  tool: ToolKey,
  input: string,
  opt: Record<string, string> = {},
  overrides: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const tpl = TOOL_TEMPLATES[tool];
  return callAzureOpenAI({
    messages: buildToolMessages(tool, input, opt),
    temperature: overrides.temperature ?? tpl.temperature,
    maxTokens: overrides.maxTokens ?? tpl.maxTokens,
    task: tool,
  });
}
