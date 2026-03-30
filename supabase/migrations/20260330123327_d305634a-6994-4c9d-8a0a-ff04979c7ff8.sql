
-- Drop overly permissive policy
DROP POLICY "Service role full access" ON public.whatsapp_messages;

-- Create proper policies - only authenticated users can read
CREATE POLICY "Authenticated users can read messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (true);

-- Only service role (edge functions) can insert/update
CREATE POLICY "Service role can insert" ON public.whatsapp_messages
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update" ON public.whatsapp_messages
  FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can delete" ON public.whatsapp_messages
  FOR DELETE TO service_role USING (true);
