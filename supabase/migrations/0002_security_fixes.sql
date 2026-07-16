-- Patch for DBs that already applied 0001_init.sql before security hardening.
-- Fresh installs that run the updated 0001 already include these changes;
-- running 0002 on them is safe (IF EXISTS / OR REPLACE / IF NOT EXISTS).

-- 1) Only RPC may create academies
drop policy if exists academies_insert_authenticated on public.academies;

-- 2) Private medical / emergency details (out of academy_members)
create table if not exists public.member_private_details (
  member_id uuid primary key references public.academy_members(id) on delete cascade,
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_notes text,
  updated_at timestamptz not null default now()
);

-- Migrate columns if they still live on academy_members
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'academy_members'
      and column_name = 'medical_notes'
  ) then
    insert into public.member_private_details (
      member_id,
      emergency_contact_name,
      emergency_contact_phone,
      medical_notes
    )
    select
      id,
      emergency_contact_name,
      emergency_contact_phone,
      medical_notes
    from public.academy_members
    where emergency_contact_name is not null
       or emergency_contact_phone is not null
       or medical_notes is not null
    on conflict (member_id) do nothing;

    alter table public.academy_members drop column if exists emergency_contact_name;
    alter table public.academy_members drop column if exists emergency_contact_phone;
    alter table public.academy_members drop column if exists medical_notes;
  end if;
end $$;

alter table public.member_private_details enable row level security;

drop policy if exists private_details_select on public.member_private_details;
drop policy if exists private_details_insert on public.member_private_details;
drop policy if exists private_details_update on public.member_private_details;

create policy private_details_select on public.member_private_details for select using (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and (
        m.profile_id = auth.uid()
        or public.has_academy_role(
          m.academy_id,
          array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
        )
      )
  )
);
create policy private_details_insert on public.member_private_details for insert with check (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and (
        m.profile_id = auth.uid()
        or public.has_academy_role(
          m.academy_id,
          array['owner','administrator','instructor']::public.member_role[]
        )
      )
  )
);
create policy private_details_update on public.member_private_details for update using (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and (
        m.profile_id = auth.uid()
        or public.has_academy_role(
          m.academy_id,
          array['owner','administrator','instructor']::public.member_role[]
        )
      )
  )
) with check (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and (
        m.profile_id = auth.uid()
        or public.has_academy_role(
          m.academy_id,
          array['owner','administrator','instructor']::public.member_role[]
        )
      )
  )
);

-- 3) Notifications fan-out RPC
create or replace function public.notify_profile(
  p_profile_id uuid,
  p_title text,
  p_description text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- caller must share an academy with target OR be inserting for self
  if p_profile_id <> auth.uid() and not exists (
    select 1
    from public.academy_members me
    join public.academy_members them on them.academy_id = me.academy_id
    where me.profile_id = auth.uid()
      and them.profile_id = p_profile_id
      and me.status = 'active'
      and me.role in ('owner','administrator','instructor')
  ) then
    raise exception 'not allowed';
  end if;

  insert into public.notifications (profile_id, title, description)
  values (p_profile_id, p_title, p_description);
end;
$$;

revoke all on function public.notify_profile from public;
grant execute on function public.notify_profile to authenticated;

-- 4) Atomic approve check-in
create or replace function public.approve_attendance_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.attendance_requests%rowtype;
  v_session public.class_sessions%rowtype;
  v_academy_id uuid;
  v_record_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_req from public.attendance_requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'not pending'; end if;

  select s.* into v_session from public.class_sessions s where s.id = v_req.session_id;
  select c.academy_id into v_academy_id from public.classes c where c.id = v_session.class_id;

  if not public.has_academy_role(v_academy_id, array['owner','administrator','instructor']::public.member_role[]) then
    raise exception 'not allowed';
  end if;

  update public.attendance_requests set status = 'approved' where id = p_request_id;

  insert into public.attendance_records (session_id, student_id, attendance_type)
  values (v_req.session_id, v_req.student_id, 'self_checkin')
  on conflict (session_id, student_id) do nothing
  returning id into v_record_id;

  return coalesce(v_record_id, (select id from public.attendance_records where session_id = v_req.session_id and student_id = v_req.student_id));
end;
$$;

revoke all on function public.approve_attendance_request from public;
grant execute on function public.approve_attendance_request to authenticated;
