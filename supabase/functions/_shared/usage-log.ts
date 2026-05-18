// Shared helper to track operation lifecycle in ai_usage_logs.
// Status flow: pending -> running -> succeeded | failed
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export async function startLog(params: {
  userId: string;
  operation: string;
  model: string;
}): Promise<{ id: string | null; startedAt: number }> {
  const startedAt = Date.now();
  try {
    const { data } = await adminClient()
      .from('ai_usage_logs')
      .insert({
        user_id: params.userId,
        operation: params.operation,
        model: params.model,
        status: 'pending',
      })
      .select('id')
      .single();
    return { id: data?.id ?? null, startedAt };
  } catch {
    return { id: null, startedAt };
  }
}

export async function markRunning(id: string | null) {
  if (!id) return;
  try { await adminClient().from('ai_usage_logs').update({ status: 'running' }).eq('id', id); } catch { /* noop */ }
}

export async function finishLog(
  id: string | null,
  params: {
    startedAt: number;
    status: 'succeeded' | 'failed';
    summary?: string | null;
    errorMessage?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
  },
) {
  const latency_ms = Date.now() - params.startedAt;
  const payload = {
    status: params.status,
    summary: params.summary ?? null,
    error_message: params.errorMessage ?? null,
    prompt_tokens: params.promptTokens ?? null,
    completion_tokens: params.completionTokens ?? null,
    total_tokens: params.totalTokens ?? null,
    latency_ms,
  };
  try {
    if (id) {
      await adminClient().from('ai_usage_logs').update(payload).eq('id', id);
    } else {
      // Fallback: insert if we never got an id
      await adminClient().from('ai_usage_logs').insert({ ...payload });
    }
  } catch { /* noop */ }
}
