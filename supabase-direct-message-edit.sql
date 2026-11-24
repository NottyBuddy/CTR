-- CTR direct-message editing permission migration.
-- Run once in Supabase SQL Editor. This preserves all existing messages and data.
alter table public.ctr_direct_messages
 add column if not exists edited_at timestamptz;

drop policy if exists "Users can edit own direct messages" on public.ctr_direct_messages;
create policy "Users can edit own direct messages"
on public.ctr_direct_messages
for update to authenticated
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

