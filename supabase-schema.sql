-- CTR: Calling Team Records. Run once in Supabase SQL Editor.
create table if not exists public.ctr_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 chat_color text not null unique check(chat_color in ('#8E7CFF','#36A6D9','#20B58A','#E59A3B','#E16C91','#A1A94B','#D477D1','#6E91C9')),
 created_at timestamptz not null default now()
);
create table if not exists public.ctr_group_notes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 author_email text not null,
 body text not null check(char_length(body) between 1 and 20000),
 created_at timestamptz not null default now()
);
create table if not exists public.ctr_personal_notes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 20000),
 created_at timestamptz not null default now()
);
alter table public.ctr_profiles enable row level security;
alter table public.ctr_group_notes enable row level security;
alter table public.ctr_personal_notes enable row level security;
drop policy if exists "Signed in users can see colours" on public.ctr_profiles;
create policy "Signed in users can see colours" on public.ctr_profiles for select to authenticated using(true);
drop policy if exists "Users choose own colour once" on public.ctr_profiles;
create policy "Users choose own colour once" on public.ctr_profiles for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "No profile colour changes" on public.ctr_profiles;
create policy "No profile colour changes" on public.ctr_profiles for update to authenticated using(false);
drop policy if exists "Users can read group notes" on public.ctr_group_notes;
create policy "Users can read group notes" on public.ctr_group_notes for select to authenticated using(true);
drop policy if exists "Users can post own group notes" on public.ctr_group_notes;
create policy "Users can post own group notes" on public.ctr_group_notes for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users can delete own group notes" on public.ctr_group_notes;
create policy "Users can delete own group notes" on public.ctr_group_notes for delete to authenticated using(auth.uid()=user_id);
drop policy if exists "Users can read own personal notes" on public.ctr_personal_notes;
create policy "Users can read own personal notes" on public.ctr_personal_notes for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Users can add own personal notes" on public.ctr_personal_notes;
create policy "Users can add own personal notes" on public.ctr_personal_notes for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users can delete own personal notes" on public.ctr_personal_notes;
create policy "Users can delete own personal notes" on public.ctr_personal_notes for delete to authenticated using(auth.uid()=user_id);
do $$ begin
 alter publication supabase_realtime add table public.ctr_group_notes;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
 alter publication supabase_realtime add table public.ctr_personal_notes;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- Direct messages + safe team directory. Run this update in Supabase SQL Editor.
create table if not exists public.ctr_team_directory (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique,
 display_name text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.ctr_direct_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 sender_email text not null,
 body text not null check(char_length(body) between 1 and 20000),
 created_at timestamptz not null default now(),
 check(sender_id <> recipient_id)
);
alter table public.ctr_team_directory enable row level security;
alter table public.ctr_direct_messages enable row level security;
drop policy if exists "Authenticated users can view team directory" on public.ctr_team_directory;
create policy "Authenticated users can view team directory" on public.ctr_team_directory
 for select to authenticated using(true);
drop policy if exists "Participants and admin can read direct messages" on public.ctr_direct_messages;
create policy "Participants and admin can read direct messages" on public.ctr_direct_messages
 for select to authenticated using (
  auth.uid()=sender_id or auth.uid()=recipient_id
  or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com'
 );
drop policy if exists "Users can send direct messages" on public.ctr_direct_messages;
create policy "Users can send direct messages" on public.ctr_direct_messages
 for insert to authenticated with check(auth.uid()=sender_id and auth.uid()<>recipient_id);
create or replace function public.ctr_sync_team_directory()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_name text;
begin
 v_name := coalesce(nullif(new.raw_user_meta_data->>'full_name',''),
  case lower(new.email)
   when 'hrhca39899_indiframe@hrhnow.in' then 'Amrutha Shiva Kumar'
   when 'hrhca39898_indiframe@hrhnow.in' then 'Nandkishor Kasoju'
   when 'hrhca39264_indiframe@hrhnow.in' then 'Mohd Javeed Ali'
   when 'mahesh.s@hrhnext.com' then 'Mahesh Sharma'
   else split_part(coalesce(new.email,'CTR Member'),'@',1)
  end);
 insert into public.ctr_team_directory(user_id,email,display_name)
 values(new.id,lower(new.email),v_name)
 on conflict(user_id) do update set email=excluded.email,display_name=excluded.display_name;
 return new;
end;
$$;
drop trigger if exists ctr_auth_user_directory_sync on auth.users;
create trigger ctr_auth_user_directory_sync after insert or update of email,raw_user_meta_data on auth.users
 for each row execute procedure public.ctr_sync_team_directory();
insert into public.ctr_team_directory(user_id,email,display_name)
select id,lower(email),coalesce(nullif(raw_user_meta_data->>'full_name',''),
 case lower(email)
  when 'hrhca39899_indiframe@hrhnow.in' then 'Amrutha Shiva Kumar'
  when 'hrhca39898_indiframe@hrhnow.in' then 'Nandkishor Kasoju'
  when 'hrhca39264_indiframe@hrhnow.in' then 'Mohd Javeed Ali'
  when 'mahesh.s@hrhnext.com' then 'Mahesh Sharma'
  else split_part(coalesce(email,'CTR Member'),'@',1)
 end)
from auth.users
on conflict(user_id) do update set email=excluded.email,display_name=excluded.display_name;
do $$ begin
 alter publication supabase_realtime add table public.ctr_direct_messages;
exception when duplicate_object then null; when undefined_object then null;
end $$;


-- CTR admin message deletion permissions (run this update in Supabase SQL Editor).
drop policy if exists "CTR admin can delete any group note" on public.ctr_group_notes;
create policy "CTR admin can delete any group note"
on public.ctr_group_notes for delete to authenticated
using (lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');

drop policy if exists "CTR admin can delete any direct message" on public.ctr_direct_messages;
create policy "CTR admin can delete any direct message"
on public.ctr_direct_messages for delete to authenticated
using (lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');


-- CTR: expanded admin permissions, edits, pinning, reactions and deletion audit.
alter table public.ctr_group_notes add column if not exists edited_at timestamptz;
alter table public.ctr_group_notes add column if not exists is_pinned boolean not null default false;
alter table public.ctr_group_notes add column if not exists reactions jsonb not null default '{}'::jsonb;
alter table public.ctr_personal_notes add column if not exists edited_at timestamptz;
drop policy if exists "Users can read own personal notes" on public.ctr_personal_notes;
create policy "Users and admin can read personal notes" on public.ctr_personal_notes for select to authenticated using(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');
drop policy if exists "Users can delete own personal notes" on public.ctr_personal_notes;
create policy "Users delete own and admin all personal notes" on public.ctr_personal_notes for delete to authenticated using(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');
drop policy if exists "Users can update own personal notes" on public.ctr_personal_notes;
drop policy if exists "Users and admin update personal notes" on public.ctr_personal_notes;
create policy "Users and admin update personal notes" on public.ctr_personal_notes for update to authenticated using(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com') with check(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');
drop policy if exists "Users can update own group notes" on public.ctr_group_notes;
create policy "Users and admin update group notes" on public.ctr_group_notes for update to authenticated using(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com') with check(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');
drop policy if exists "CTR admin can delete any group note" on public.ctr_group_notes;
create policy "Users delete own and admin all group notes" on public.ctr_group_notes for delete to authenticated using(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');
create table if not exists public.ctr_moderation_log(id uuid primary key default gen_random_uuid(),table_name text not null,record_id uuid not null,deleted_by uuid,deleted_by_email text,original_body text,deleted_at timestamptz not null default now());
alter table public.ctr_moderation_log enable row level security;
drop policy if exists "Admin can read moderation log" on public.ctr_moderation_log;
create policy "Admin can read moderation log" on public.ctr_moderation_log for select to authenticated using(lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');
create or replace function public.ctr_audit_note_delete() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.ctr_moderation_log(table_name,record_id,deleted_by,deleted_by_email,original_body) values(tg_table_name,old.id,auth.uid(),auth.jwt()->>'email',old.body);return old;end;$$;
drop trigger if exists ctr_group_note_delete_audit on public.ctr_group_notes;
create trigger ctr_group_note_delete_audit before delete on public.ctr_group_notes for each row execute function public.ctr_audit_note_delete();
drop trigger if exists ctr_personal_note_delete_audit on public.ctr_personal_notes;
create trigger ctr_personal_note_delete_audit before delete on public.ctr_personal_notes for each row execute function public.ctr_audit_note_delete();
drop trigger if exists ctr_direct_message_delete_audit on public.ctr_direct_messages;
create trigger ctr_direct_message_delete_audit before delete on public.ctr_direct_messages for each row execute function public.ctr_audit_note_delete();


-- FINAL CTR permissions: normal users cannot delete group or personal notes.
drop policy if exists "Users can delete own group notes" on public.ctr_group_notes;
drop policy if exists "CTR admin can delete any group note" on public.ctr_group_notes;
drop policy if exists "Users delete own and admin all group notes" on public.ctr_group_notes;
create policy "Only CTR admin can delete group notes"
on public.ctr_group_notes for delete to authenticated
using(lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');

drop policy if exists "Users can delete own personal notes" on public.ctr_personal_notes;
drop policy if exists "Users delete own and admin all personal notes" on public.ctr_personal_notes;
create policy "Only CTR admin can delete personal notes"
on public.ctr_personal_notes for delete to authenticated
using(lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');

drop policy if exists "Users and admin can read personal notes" on public.ctr_personal_notes;
create policy "Owners and CTR admin can read personal notes"
on public.ctr_personal_notes for select to authenticated
using(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');


-- Atomic reaction toggle: members can react to any group note without gaining
-- permission to edit another member's note body.
create or replace function public.ctr_toggle_group_reaction(p_note_id uuid,p_emoji text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_reactions jsonb; v_users jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_emoji not in ('👍','✅','👀') then raise exception 'Unsupported reaction'; end if;
 select coalesce(reactions,'{}'::jsonb) into v_reactions
 from public.ctr_group_notes where id=p_note_id for update;
 if not found then raise exception 'Message not found'; end if;
 v_users:=coalesce(v_reactions->p_emoji,'[]'::jsonb);
 if v_users ? auth.uid()::text then
  select coalesce(jsonb_agg(value),'[]'::jsonb) into v_users
  from jsonb_array_elements(v_users) where value #>> '{}' <> auth.uid()::text;
 else
  v_users:=v_users||jsonb_build_array(auth.uid()::text);
 end if;
 update public.ctr_group_notes
 set reactions=jsonb_set(v_reactions,array[p_emoji],v_users,true)
 where id=p_note_id;
end;
$$;
revoke all on function public.ctr_toggle_group_reaction(uuid,text) from public;
grant execute on function public.ctr_toggle_group_reaction(uuid,text) to authenticated;

-- CTR callback reminders. Run this SQL update once in Supabase SQL Editor.
create table if not exists public.ctr_followups (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 customer_name text not null check(char_length(customer_name) between 1 and 200),
 phone text not null check(char_length(phone) between 5 and 30),
 callback_at timestamptz not null,
 details text not null default '',
 status text not null default 'pending' check(status in ('pending','completed')),
 completed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.ctr_followups enable row level security;
drop policy if exists "CTR members can view followups" on public.ctr_followups;
create policy "CTR members can view followups" on public.ctr_followups for select to authenticated using(true);
drop policy if exists "CTR members can create own followups" on public.ctr_followups;
create policy "CTR members can create own followups" on public.ctr_followups for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Owners and admin update followups" on public.ctr_followups;
create policy "Owners and admin update followups" on public.ctr_followups for update to authenticated
using(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com')
with check(auth.uid()=user_id or lower(coalesce(auth.jwt()->>'email',''))='mahesh.s@hrhnext.com');
do $$ begin
 alter publication supabase_realtime add table public.ctr_followups;
exception when duplicate_object then null; when undefined_object then null;
end $$;


-- CTR pinning: admin-only atomic toggle with explicit permission check.
create or replace function public.ctr_toggle_group_pin(p_note_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_pinned boolean;
begin
 if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) <> 'mahesh.s@hrhnext.com' then
  raise exception 'Only CTR admin can pin or unpin messages';
 end if;
 update public.ctr_group_notes set is_pinned=not is_pinned where id=p_note_id returning is_pinned into v_pinned;
 if not found then raise exception 'Message not found'; end if;
 return v_pinned;
end;
$$;
revoke all on function public.ctr_toggle_group_pin(uuid) from public;
grant execute on function public.ctr_toggle_group_pin(uuid) to authenticated;

-- Follow-ups are shared by the team; any authenticated team member can complete them.
drop policy if exists "Owners and admin update followups" on public.ctr_followups;
drop policy if exists "CTR members can complete followups" on public.ctr_followups;
create policy "CTR members can complete followups" on public.ctr_followups
 for update to authenticated using(true) with check(true);
