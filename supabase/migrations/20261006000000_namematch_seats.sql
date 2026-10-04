-- NameMatch: returning participants ("who is connecting?")
-- A participant ("seat") can be used from more than one device / browser.
-- An extra device gets its own membership row that points at the seat (seat_of) and
-- reads/writes the seat's swipes, so nobody is counted twice.

alter table public.room_members add column if not exists seat_of uuid;
do $$ begin
  alter table public.room_members add constraint room_members_seat_fk
    foreign key (room_code, seat_of) references public.room_members(room_code, user_id) on delete cascade;
exception when duplicate_object then null; end $$;

-- the seat the caller acts as in a room (its own id, or the seat it is linked to)
create or replace function public.my_seat(p_code text)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(m.seat_of, m.user_id) from public.room_members m where m.room_code = p_code and m.user_id = auth.uid();
$$;
revoke all on function public.my_seat(text) from public, anon;
grant execute on function public.my_seat(text) to authenticated;

-- swipes are written for the caller's seat
drop policy if exists swipes_insert on public.swipes;
create policy swipes_insert on public.swipes for insert to authenticated
  with check (user_id = public.my_seat(room_code));
drop policy if exists swipes_update on public.swipes;
create policy swipes_update on public.swipes for update to authenticated
  using (user_id = public.my_seat(room_code)) with check (user_id = public.my_seat(room_code));

-- names of the participants in a room (for the "who is connecting?" screen; needs the room code)
create or replace function public.room_roster(p_code text)
returns table(display_name text) language sql stable security definer set search_path = '' as $$
  select m.display_name from public.room_members m
  where m.room_code = p_code and m.seat_of is null and auth.uid() is not null
  order by m.joined_at;
$$;
revoke all on function public.room_roster(text) from public, anon;
grant execute on function public.room_roster(text) to authenticated;

-- fold one seat into another: newer swipes win, the old seat becomes a linked device
create or replace function public.merge_seat(p_code text, p_from uuid, p_to uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_from = p_to then return; end if;
  insert into public.swipes(room_code, user_id, name, kind)
    select f.room_code, p_to, f.name, f.kind from public.swipes f
    where f.room_code = p_code and f.user_id = p_from
      and not exists (select 1 from public.swipes t where t.room_code = p_code and t.user_id = p_to and t.name = f.name and t.updated_at >= f.updated_at)
  on conflict (room_code, user_id, name) do update set kind = excluded.kind;
  delete from public.swipes where room_code = p_code and user_id = p_from;
  update public.room_members set seat_of = p_to where room_code = p_code and (user_id = p_from or seat_of = p_from);
end $$;
revoke all on function public.merge_seat(text,uuid,uuid) from public, anon, authenticated;

-- "I'm <name>": connect this device to an existing participant
create or replace function public.claim_seat(p_code text, p_name text)
returns public.rooms language plpgsql security definer set search_path = '' as $$
declare r public.rooms; seat uuid; mine public.room_members; n int;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into r from public.rooms where code = p_code;
  if not found then raise exception 'room not found' using errcode = 'P0002'; end if;
  select m.user_id into seat from public.room_members m
    where m.room_code = p_code and m.seat_of is null and lower(btrim(m.display_name)) = lower(btrim(p_name))
    order by m.joined_at limit 1;
  if seat is null then raise exception 'no such participant' using errcode = 'P0004'; end if;
  select * into mine from public.room_members where room_code = p_code and user_id = auth.uid();
  if found then
    if mine.user_id = seat or mine.seat_of = seat then return r; end if;
    if mine.seat_of is null then perform public.merge_seat(p_code, mine.user_id, seat);
    else update public.room_members set seat_of = seat where room_code = p_code and user_id = auth.uid(); end if;
    return r;
  end if;
  select count(*) into n from public.room_members where room_code = p_code;
  if n >= 12 then raise exception 'room full' using errcode = 'P0001'; end if;
  insert into public.room_members(room_code, user_id, display_name, seat_of)
    select p_code, auth.uid(), m.display_name, seat from public.room_members m where m.room_code = p_code and m.user_id = seat;
  return r;
end $$;
revoke all on function public.claim_seat(text,text) from public, anon;
grant execute on function public.claim_seat(text,text) to authenticated;

-- joining as a new participant: only participants count toward the limit, and a name that is
-- already in the room is refused (P0003) so the site can offer to connect to it instead
create or replace function public.join_room(p_code text, p_name text)
returns public.rooms language plpgsql security definer set search_path = '' as $$
declare r public.rooms; n int;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into r from public.rooms where code = p_code;
  if not found then raise exception 'room not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.room_members where room_code = p_code and user_id = auth.uid()) then
    update public.room_members set display_name = left(btrim(p_name), 30)
      where room_code = p_code and user_id = auth.uid() and seat_of is null;
    return r;
  end if;
  if exists (select 1 from public.room_members where room_code = p_code and seat_of is null
             and lower(btrim(display_name)) = lower(btrim(p_name))) then
    raise exception 'name taken' using errcode = 'P0003';
  end if;
  select count(*) into n from public.room_members where room_code = p_code and seat_of is null;
  if n >= 4 then raise exception 'room full' using errcode = 'P0001'; end if;
  insert into public.room_members(room_code, user_id, display_name) values (p_code, auth.uid(), left(btrim(p_name), 30));
  return r;
end $$;

-- clean up rooms that already got a duplicate participant (same name twice): keep the first one
do $$ declare d record; begin
  for d in
    select m.room_code, m.user_id, (select k.user_id from public.room_members k
             where k.room_code = m.room_code and k.seat_of is null and lower(btrim(k.display_name)) = lower(btrim(m.display_name))
             order by k.joined_at limit 1) as keep
    from public.room_members m where m.seat_of is null
  loop
    if d.keep is not null and d.keep <> d.user_id then perform public.merge_seat(d.room_code, d.user_id, d.keep); end if;
  end loop;
end $$;
