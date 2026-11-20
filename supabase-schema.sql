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