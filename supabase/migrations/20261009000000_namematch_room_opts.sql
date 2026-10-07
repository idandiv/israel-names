-- Room deck filters (era / popularity), shared by everyone in the room.
-- opts bits: 1 = current names, 2 = classics, 4 = popular, 8 = distinctive (0 = no filter).
alter table public.rooms add column if not exists opts smallint not null default 0 check (opts between 0 and 15);

drop function if exists public.create_room(text,text,int,boolean,text);
create or replace function public.create_room(p_code text, p_sex text, p_sectors int, p_unisex boolean, p_name text, p_opts int default 0)
returns public.rooms language plpgsql security definer set search_path = '' as $$
declare r public.rooms;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into public.rooms(code, sex, sectors, unisex, opts, created_by)
    values (p_code, p_sex, p_sectors, p_unisex, greatest(0, least(15, coalesce(p_opts, 0))), auth.uid()) returning * into r;
  insert into public.room_members(room_code, user_id, display_name) values (p_code, auth.uid(), left(btrim(p_name), 30));
  return r;
end $$;
revoke all on function public.create_room(text,text,int,boolean,text,int) from public, anon;
grant execute on function public.create_room(text,text,int,boolean,text,int) to authenticated;
