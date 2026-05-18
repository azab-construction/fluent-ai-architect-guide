ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS operation text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_logs_operation_idx ON public.ai_usage_logs (operation);

DROP TRIGGER IF EXISTS update_ai_usage_logs_updated_at ON public.ai_usage_logs;
CREATE TRIGGER update_ai_usage_logs_updated_at
BEFORE UPDATE ON public.ai_usage_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow service role to update log rows (status transitions pending -> running -> succeeded/failed)
DROP POLICY IF EXISTS "Service role updates logs" ON public.ai_usage_logs;
CREATE POLICY "Service role updates logs" ON public.ai_usage_logs
FOR UPDATE TO service_role USING (true) WITH CHECK (true);