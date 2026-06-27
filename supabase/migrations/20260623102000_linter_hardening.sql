-- =========================================================
-- Supabase Database Linter Hardening
-- - Remove public object listing policy from whatsapp-media.
-- - Hide sensitive tables from the anonymous GraphQL schema.
-- - Revoke public execution of exposed SECURITY DEFINER maintenance helpers.
--
-- Notes:
-- - This migration intentionally keeps authenticated SELECT grants because the
--   current web app reads several tables through supabase-js. Revoking those
--   grants would require moving those reads behind Edge Functions or SECURITY
--   DEFINER RPCs first.
-- - Bucket `whatsapp-media` may remain public for direct object URL access, but
--   broad SELECT policies on storage.objects are not required for public URLs and
--   allow bucket listing.
-- =========================================================

-- Public buckets do not need storage.objects SELECT policies for direct public
-- object URLs. Drop both the historical migration name and the linter-reported
-- policy name to handle deployed drift safely.
drop policy if exists "WhatsApp media publicly readable" on storage.objects;
drop policy if exists "Authenticated can read whatsapp media" on storage.objects;

-- Prevent anonymous GraphQL/API discovery for application tables that should not
-- be visible before sign-in. RLS remains the data boundary, but revoking SELECT
-- from anon removes the unauthenticated exposure flagged by the linter.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_usage_logs',
    'chat_messages',
    'chat_sessions',
    'contracts',
    'finance_daftra_integrations',
    'finance_statements',
    'finance_transactions',
    'profiles',
    'projects',
    'quotes',
    'reports',
    'tasks',
    'user_roles',
    'whatsapp_messages'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke select on table public.%I from anon', table_name);
    end if;
  end loop;
end
$$;

-- The linter reported public execution on public.rls_auto_enable(). Do not allow
-- anon/authenticated callers to invoke SECURITY DEFINER maintenance functions.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end
$$;
