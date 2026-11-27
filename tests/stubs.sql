-- Minimal stand-ins for what Supabase provides, for local testing only.
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
grant usage on schema auth, storage, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
create table storage.objects (bucket_id text, name text);
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
-- Supabase grants table access by default; the schema must remove it.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
