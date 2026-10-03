-- NameMatch (couples swipe) — realtime rooms
-- Access model: every visitor gets an anonymous Supabase user (no e-mail).
-- A room is visible only to its members (max 4 devices per room).
-- Rooms and memberships are created only through the two RPCs below;
-- swipes are written directly by each member and streamed with Realtime.

create table if not exists public.rooms (
  code        text primary key check (code ~ '^[a-z0-9]{8,16}$'),
  sex         text not null check (sex in ('f','m','a')),
  sectors     smallint not null default 1 check (sectors between 1 and 15),
  unisex      boolean not null default true,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.room_members (
  room_code    text not null references public.rooms(code) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  joined_at    timestamptz not null default now(),
  primary key (room_code, user_id)
);

create table if not exists public.swipes (
  room_code  text not null,
  user_id    uuid not null default auth.uid(),
  name       text not null check (char_length(name) between 1 and 40),
  kind       text not null check (kind in ('like','super','pass','none')),  -- 'none' = undone
  updated_at timestamptz not null default now(),
  primary key (room_code, user_id, name),
  foreign key (room_code, user_id) references public.room_members(room_code, user_id) on delete cascade
);
create index if not exists swipes_room_idx on public.swipes(room_code);

create or replace function public.swipes_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists swipes_touch on public.swipes;
create trigger swipes_touch before update on public.swipes for each row execute function public.swipes_touch();

-- membership check used by the policies (security definer avoids policy recursion)
create or replace function public.is_room_member(p_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members m where m.room_code = p_code and m.user_id = auth.uid());
$$;

create or replace function public.create_room(p_code text, p_sex text, p_sectors int, p_unisex boolean, p_name text)
returns public.rooms language plpgsql security definer set search_path = '' as $$
declare r public.rooms;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into public.rooms(code, sex, sectors, unisex, created_by)
    values (p_code, p_sex, p_sectors, p_unisex, auth.uid()) returning * into r;
  insert into public.room_members(room_code, user_id, display_name) values (p_code, auth.uid(), left(btrim(p_name), 30));
  return r;
end $$;

create or replace function public.join_room(p_code text, p_name text)
returns public.rooms language plpgsql security definer set search_path = '' as $$
declare r public.rooms; n int;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into r from public.rooms where code = p_code;
  if not found then raise exception 'room not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.room_members where room_code = p_code and user_id = auth.uid()) then
    update public.room_members set display_name = left(btrim(p_name), 30) where room_code = p_code and user_id = auth.uid();
    return r;
  end if;
  select count(*) into n from public.room_members where room_code = p_code;
  if n >= 4 then raise exception 'room full' using errcode = 'P0001'; end if;
  insert into public.room_members(room_code, user_id, display_name) values (p_code, auth.uid(), left(btrim(p_name), 30));
  return r;
end $$;

-- Row Level Security
alter table public.rooms        enable row level security;
alter table public.room_members enable row level security;
alter table public.swipes       enable row level security;

drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select to authenticated using (public.is_room_member(code));

drop policy if exists members_read on public.room_members;
create policy members_read on public.room_members for select to authenticated using (public.is_room_member(room_code));

drop policy if exists swipes_read on public.swipes;
create policy swipes_read on public.swipes for select to authenticated using (public.is_room_member(room_code));
drop policy if exists swipes_insert on public.swipes;
create policy swipes_insert on public.swipes for insert to authenticated
  with check (user_id = auth.uid() and public.is_room_member(room_code));
drop policy if exists swipes_update on public.swipes;
create policy swipes_update on public.swipes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_room_member(room_code));

-- Privileges: nothing for the anon role (signed-out); members act as "authenticated"
revoke all on public.rooms, public.room_members, public.swipes from anon, authenticated;
grant select on public.rooms, public.room_members to authenticated;
grant select, insert, update on public.swipes to authenticated;
revoke all on function public.create_room(text,text,int,boolean,text) from public, anon;
revoke all on function public.join_room(text,text) from public, anon;
revoke all on function public.is_room_member(text) from public, anon;
grant execute on function public.create_room(text,text,int,boolean,text) to authenticated;
grant execute on function public.join_room(text,text) to authenticated;
grant execute on function public.is_room_member(text) to authenticated;

-- Realtime (postgres_changes respects the select policies above)
do $$ begin
  begin alter publication supabase_realtime add table public.swipes;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_members; exception when duplicate_object then null; end;
end $$;
