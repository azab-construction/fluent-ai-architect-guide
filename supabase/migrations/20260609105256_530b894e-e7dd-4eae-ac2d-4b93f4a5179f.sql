-- 1) Drop public read policy on whatsapp-media storage objects
DROP POLICY IF EXISTS "WhatsApp media publicly readable" ON storage.objects;

-- Add private access policy: only authenticated users can read whatsapp-media files
CREATE POLICY "Authenticated can read whatsapp media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'whatsapp-media');

-- 2) Remove ai_usage_logs from realtime publication to prevent cross-user broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ai_usage_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_usage_logs';
  END IF;
END $$;