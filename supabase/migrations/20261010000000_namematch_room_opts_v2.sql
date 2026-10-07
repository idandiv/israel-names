-- Room settings v2: more era / popularity choices (bit 64 marks the v2 layout), so the value range grows to 0..127.
alter table public.rooms drop constraint if exists rooms_opts_check;
alter table public.rooms add constraint rooms_opts_check check (opts between 0 and 127);
create or replace function public.create_room(p_code text, p_sex text, p_sectors int, p_unisex boolean, p_name text, p_opts int default 0)
returns public.rooms language plpgsql security definer set search_path = '' as $$
declare r public.rooms;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into public.rooms(code, sex, sectors, unisex, opts, created_by)
    values (p_code, p_sex, p_sectors, p_unisex, greatest(0, least(127, coalesce(p_opts, 0))), auth.uid()) returning * into r;
  insert into public.room_members(room_code, user_id, display_name) values (p_code, auth.uid(), left(btrim(p_name), 30));
  return r;
end $$;
