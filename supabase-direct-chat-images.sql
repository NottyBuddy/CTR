-- Orbit Direct Chat image attachments
-- Run once in Supabase SQL Editor before using image upload / screenshot paste.

alter table public.ctr_direct_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  alter column body set default '';

alter table public.ctr_direct_messages
  drop constraint if exists ctr_direct_messages_body_check;

alter table public.ctr_direct_messages
  add constraint ctr_direct_messages_body_check
  check (
    (char_length(body) between 1 and 20000)
    or (char_length(body) = 0 and attachment_path is not null)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orbit-dm-images',
  'orbit-dm-images',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Orbit DM images participants can view" on storage.objects;
create policy "Orbit DM images participants can view"
on storage.objects for select to authenticated
using (
  bucket_id = 'orbit-dm-images'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or auth.uid()::text = split_part(name, '/', 2)
    or lower(coalesce(auth.jwt()->>'email','')) = 'mahesh.s@hrhnext.com'
  )
);

drop policy if exists "Orbit DM images sender can upload" on storage.objects;
create policy "Orbit DM images sender can upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'orbit-dm-images'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Orbit DM images sender or admin can delete" on storage.objects;
create policy "Orbit DM images sender or admin can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'orbit-dm-images'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or lower(coalesce(auth.jwt()->>'email','')) = 'mahesh.s@hrhnext.com'
  )
);
