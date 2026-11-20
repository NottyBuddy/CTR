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
