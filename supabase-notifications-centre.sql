-- CTR notification centre. Run once in Supabase SQL Editor.
-- Notifications contain no customer message text or phone numbers.
create table if not exists public.ctr_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 kind text not null check(kind in ('group','direct','followup')),
 reference_id uuid,
 title text not null,
 body text not null default '',
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists ctr_notifications_recipient_created_idx
 on public.ctr_notifications(recipient_id,created_at desc);
alter table public.ctr_notifications enable row level security;
drop policy if exists "Users read own notifications" on public.ctr_notifications;
create policy "Users read own notifications" on public.ctr_notifications
 for select to authenticated using(auth.uid()=recipient_id);
drop policy if exists "Users mark own notifications read" on public.ctr_notifications;
create policy "Users mark own notifications read" on public.ctr_notifications
 for update to authenticated using(auth.uid()=recipient_id)
 with check(auth.uid()=recipient_id);
drop policy if exists "Users delete own notifications" on public.ctr_notifications;
create policy "Users delete own notifications" on public.ctr_notifications
 for delete to authenticated using(auth.uid()=recipient_id);
revoke insert, truncate on public.ctr_notifications from anon,authenticated;
grant select,update,delete on public.ctr_notifications to authenticated;

create or replace function public.ctr_notify_group_note()
returns trigger language plpgsql security definer set search_path=public,auth
as $$
begin
 insert into public.ctr_notifications(recipient_id,actor_id,kind,reference_id,title,body)
 select id,new.user_id,'group',new.id,'New group update','A team member shared a new group note.'
 from auth.users where id<>new.user_id;
 return new;
end;
$$;
create or replace function public.ctr_notify_direct_message()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.ctr_notifications(recipient_id,actor_id,kind,reference_id,title,body)
 values(new.recipient_id,new.sender_id,'direct',new.id,'New direct message','You received a new private team message.');
 return new;
end;
$$;
create or replace function public.ctr_notify_followup()
returns trigger language plpgsql security definer set search_path=public,auth
as $$
begin
 insert into public.ctr_notifications(recipient_id,actor_id,kind,reference_id,title,body)
 select id,new.user_id,'followup',new.id,'New follow-up scheduled','A team callback has been added to the shared queue.'
 from auth.users where id<>new.user_id;
 return new;
end;
$$;
drop trigger if exists ctr_group_note_notify on public.ctr_group_notes;
create trigger ctr_group_note_notify after insert on public.ctr_group_notes
 for each row execute function public.ctr_notify_group_note();
drop trigger if exists ctr_direct_message_notify on public.ctr_direct_messages;
create trigger ctr_direct_message_notify after insert on public.ctr_direct_messages
 for each row execute function public.ctr_notify_direct_message();
drop trigger if exists ctr_followup_notify on public.ctr_followups;
create trigger ctr_followup_notify after insert on public.ctr_followups
 for each row execute function public.ctr_notify_followup();
do $$ begin
 alter publication supabase_realtime add table public.ctr_notifications;
exception when duplicate_object then null; when undefined_object then null;
end $$;
