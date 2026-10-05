-- Leave a room: removes the caller's participant in that room (its swipes and linked devices cascade).
-- A room with nobody left is deleted.
create or replace function public.leave_room(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); seat uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select coalesce(m.seat_of, m.user_id) into seat from public.room_members m where m.room_code = p_code and m.user_id = me;
  if seat is null then return; end if;
  delete from public.room_members where room_code = p_code and (user_id = seat or user_id = me);
  delete from public.rooms ro where ro.code = p_code and not exists (select 1 from public.room_members m where m.room_code = p_code);
end $$;
revoke all on function public.leave_room(text) from public, anon;
grant execute on function public.leave_room(text) to authenticated;
