-- "Delete all my data": removes the caller's memberships (their swipes cascade), rooms left empty,
-- and the caller's anonymous user. Called by the site before it clears local storage.
create or replace function public.delete_my_data()
returns table(rooms_left int, swipes_deleted int)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); sw int; rl int;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select count(*) into sw from public.swipes where user_id = me;
  delete from public.room_members where user_id = me;
  delete from public.rooms ro where not exists (select 1 from public.room_members m where m.room_code = ro.code);
  get diagnostics rl = row_count;
  delete from auth.users where id = me and is_anonymous;
  return query select rl, sw;
end $$;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
