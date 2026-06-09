import { supabase } from '@/integrations/supabase/client';

export interface AzureMessage { role: 'system' | 'user' | 'assistant'; content: string }

export async function callAzureOpenAI(opts: {
  messages: AzureMessage[];
  temperature?: number;
  maxTokens?: number;
  task?: string;
}): Promise<string> {
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
