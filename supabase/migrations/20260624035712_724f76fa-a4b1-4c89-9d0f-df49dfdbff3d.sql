-- Restrict access to eng-ai-storage and root buckets to file owners (first path segment = auth.uid())

CREATE POLICY "eng_ai_storage_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'eng-ai-storage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "eng_ai_storage_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'eng-ai-storage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "eng_ai_storage_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'eng-ai-storage' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'eng-ai-storage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "eng_ai_storage_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'eng-ai-storage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "root_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'root' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "root_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'root' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "root_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'root' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'root' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "root_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'root' AND auth.uid()::text = (storage.foldername(name))[1]);