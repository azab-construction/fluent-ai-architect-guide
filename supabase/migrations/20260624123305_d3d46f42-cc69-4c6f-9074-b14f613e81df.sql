
CREATE POLICY "finance_files_select_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "finance_files_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "finance_files_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "finance_files_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]);
