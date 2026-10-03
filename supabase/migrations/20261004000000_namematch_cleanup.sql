-- NameMatch maintenance
-- 1) Rooms with no activity for 90 days are deleted (members and swipes cascade),
--    and anonymous users that belong to no room and are older than 90 days are removed.
-- 2) Realtime publishes only inserts/updates: delete events are not filtered by RLS,
--    so publishing them would leak room codes of deleted rows to other subscribers.

create or replace function public.cleanup_old_rooms()
returns table(rooms_deleted int, users_deleted int)
language plpgsql security definer set search_path = '' as $$
declare r int; u int;
begin
  with stale as (
    select ro.code from public.rooms ro
    where greatest(ro.created_at,
                   coalesce((select max(s.updated_at) from public.swipes s where s.room_code = ro.code), ro.created_at),
                   coalesce((select max(m.joined_at)  from public.room_members m where m.room_code = ro.code), ro.created_at))
          < now() - interval '90 days')
  delete from public.rooms where code in (select code from stale);
  get diagnostics r = row_count;
  delete from auth.users au
   where au.is_anonymous
     and au.created_at < now() - interval '90 days'
     and not exists (select 1 from public.room_members m where m.user_id = au.id);
  get diagnostics u = row_count;
  return query select r, u;
end $$;
revoke all on function public.cleanup_old_rooms() from public, anon, authenticated;

create extension if not exists pg_cron;
do $$ begin
  perform cron.unschedule('namematch-cleanup');
exception when others then null; end $$;
select cron.schedule('namematch-cleanup', '17 3 * * *', 'select public.cleanup_old_rooms()');

alter publication supabase_realtime set (publish = 'insert, update');
