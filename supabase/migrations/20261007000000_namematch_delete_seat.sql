-- "Delete all my data" from any device also removes the participant it is linked to
-- (that participant's swipes and its other linked devices cascade).
create or replace function public.delete_my_data()
returns table(rooms_left int, swipes_deleted int)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); sw int; rl int;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select count(*) into sw from public.swipes s
    where exists (select 1 from public.room_members m where m.user_id = me and m.room_code = s.room_code and coalesce(m.seat_of, m.user_id) = s.user_id);
  delete from public.room_members t using public.room_members m
    where m.user_id = me and m.seat_of is not null and t.room_code = m.room_code and t.user_id = m.seat_of;
  delete from public.room_members where user_id = me;
  delete from public.rooms ro where not exists (select 1 from public.room_members m where m.room_code = ro.code);
  get diagnostics rl = row_count;
  delete from auth.users where id = me and is_anonymous;
  return query select rl, sw;
end $$;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
