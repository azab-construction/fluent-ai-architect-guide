-- =========================================================
-- Security Hardening
-- - Lock down storage buckets eng-ai-storage and root.
-- - Require per-user folder ownership or admin role.
-- - Set function search_path to avoid mutable search_path warnings.
-- =========================================================

-- Storage buckets should not be public for user uploads.
update storage.buckets
set public = false
where id in ('eng-ai-storage', 'root');

-- Remove broad/old policies with these names if the migration is re-run.
drop policy if exists "eng_ai_storage_select_own_or_admin" on storage.objects;
drop policy if exists "eng_ai_storage_insert_own_or_admin" on storage.objects;
drop policy if exists "eng_ai_storage_update_own_or_admin" on storage.objects;
drop policy if exists "eng_ai_storage_delete_own_or_admin" on storage.objects;

drop policy if exists "root_storage_select_own_or_admin" on storage.objects;
drop policy if exists "root_storage_insert_own_or_admin" on storage.objects;
drop policy if exists "root_storage_update_own_or_admin" on storage.objects;
drop policy if exists "root_storage_delete_own_or_admin" on storage.objects;

-- eng-ai-storage: users can only access objects below their own auth.uid() folder.
-- Admins can access all objects in the bucket.
create policy "eng_ai_storage_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'eng-ai-storage'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "eng_ai_storage_insert_own_or_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'eng-ai-storage'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "eng_ai_storage_update_own_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'eng-ai-storage'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'eng-ai-storage'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "eng_ai_storage_delete_own_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'eng-ai-storage'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- root: same restrictions. Prefer migrating user files away from root over time.
create policy "root_storage_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'root'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "root_storage_insert_own_or_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'root'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "root_storage_update_own_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'root'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'root'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "root_storage_delete_own_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'root'
  and (
    public.has_role(auth.uid(), 'admin')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Function search_path hardening for functions touched/created by current migrations.
alter function if exists public.set_updated_at() set search_path = public;
alter function if exists public.has_role(uuid, public.app_role) set search_path = public;
