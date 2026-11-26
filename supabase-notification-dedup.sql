-- Prevent duplicate notifications for the same underlying event/recipient.
-- Applied directly to Supabase project icootmtssyergamuxlxb on 2026-11-26.
create unique index if not exists ctr_notifications_recipient_kind_reference_uq
  on public.ctr_notifications(recipient_id,kind,reference_id);

create or replace function public.ctr_notify_group_note()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  insert into public.ctr_notifications(recipient_id,actor_id,kind,reference_id,title,body)
  select id,new.user_id,'group',new.id,'New group update','A team member shared a new group note.'
  from auth.users where id<>new.user_id
  on conflict(recipient_id,kind,reference_id) do nothing;
  return new;
end;$$;

create or replace function public.ctr_notify_direct_message()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.ctr_notifications(recipient_id,actor_id,kind,reference_id,title,body)
  values(new.recipient_id,new.sender_id,'direct',new.id,'New direct message','You received a new private team message.')
  on conflict(recipient_id,kind,reference_id) do nothing;
  return new;
end;$$;

create or replace function public.ctr_notify_followup()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  insert into public.ctr_notifications(recipient_id,actor_id,kind,reference_id,title,body)
  select id,new.user_id,'followup',new.id,'New follow-up scheduled','A team callback has been added to the shared queue.'
  from auth.users where id<>new.user_id
  on conflict(recipient_id,kind,reference_id) do nothing;
  return new;
end;$$;