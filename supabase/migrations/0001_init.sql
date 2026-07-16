-- enums
create type public.member_role as enum (
  'owner', 'administrator', 'instructor',
  'assistant_instructor', 'student', 'guardian'
);
create type public.member_status as enum ('active', 'inactive', 'suspended');
create type public.session_status as enum ('scheduled', 'open', 'finished', 'cancelled');
create type public.attendance_request_status as enum ('pending', 'approved', 'rejected');
create type public.attendance_type as enum ('self_checkin', 'manual');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  phone text,
  birth_date date,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  phone text,
  email text,
  instagram text,
  city text,
  state text,
  address text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_units (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_members (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'active',
  current_belt text,
  current_degree int not null default 0,
  joined_at date not null default current_date,
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academy_id, profile_id)
);

create table public.belt_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  "order" int not null unique
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  unit_id uuid references public.academy_units(id) on delete set null,
  name text not null,
  description text,
  minimum_age int,
  maximum_age int,
  minimum_belt text,
  maximum_belt text,
  is_active boolean not null default true
);

create table public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  instructor_id uuid not null references public.academy_members(id),
  date date not null,
  started_at timestamptz,
  finished_at timestamptz,
  status public.session_status not null default 'scheduled'
);

create table public.attendance_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.academy_members(id),
  requested_at timestamptz not null default now(),
  status public.attendance_request_status not null default 'pending'
);

create unique index attendance_requests_one_pending
  on public.attendance_requests (session_id, student_id)
  where status = 'pending';

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.academy_members(id),
  checked_at timestamptz not null default now(),
  attendance_type public.attendance_type not null,
  unique (session_id, student_id)
);

create table public.graduation_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.academy_members(id) on delete cascade,
  belt text not null,
  degree int not null default 0,
  graduated_at date not null default current_date,
  awarded_by uuid references public.academy_members(id),
  notes text,
  certificate_url text
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  title text not null,
  description text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper: membership
create or replace function public.is_academy_member(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.academy_members m
    where m.academy_id = aid
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_academy_role(aid uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.academy_members m
    where m.academy_id = aid
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role = any(roles)
  );
$$;

-- Secure onboarding: create academy + owner membership atomically.
-- App should call this RPC instead of raw inserts into academies/academy_members.
create or replace function public.create_academy_with_owner(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_instagram text default null,
  p_city text default null,
  p_state text default null,
  p_address text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_academy_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.academies (name, phone, email, instagram, city, state, address, description)
  values (p_name, p_phone, p_email, p_instagram, p_city, p_state, p_address, p_description)
  returning id into v_academy_id;

  insert into public.academy_members (academy_id, profile_id, role, status)
  values (v_academy_id, v_uid, 'owner', 'active');

  return v_academy_id;
end;
$$;

revoke all on function public.create_academy_with_owner from public;
grant execute on function public.create_academy_with_owner to authenticated;

alter table public.profiles enable row level security;
alter table public.academies enable row level security;
alter table public.academy_units enable row level security;
alter table public.academy_members enable row level security;
alter table public.classes enable row level security;
alter table public.class_schedules enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_requests enable row level security;
alter table public.attendance_records enable row level security;
alter table public.graduation_history enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.belt_levels enable row level security;

create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_select_same_academy on public.profiles for select using (
  exists (
    select 1 from public.academy_members me
    join public.academy_members other on other.academy_id = me.academy_id
    where me.profile_id = auth.uid() and other.profile_id = profiles.id and me.status = 'active'
  )
);

create policy academies_select_member on public.academies for select using (public.is_academy_member(id));
create policy academies_insert_authenticated on public.academies for insert with check (auth.uid() is not null);
create policy academies_update_owner on public.academies for update using (
  public.has_academy_role(id, array['owner']::public.member_role[])
);

create policy units_select_member on public.academy_units for select using (
  public.is_academy_member(academy_id)
);
create policy units_insert_staff on public.academy_units for insert with check (
  public.has_academy_role(academy_id, array['owner','administrator']::public.member_role[])
);
create policy units_update_staff on public.academy_units for update using (
  public.has_academy_role(academy_id, array['owner','administrator']::public.member_role[])
) with check (
  public.has_academy_role(academy_id, array['owner','administrator']::public.member_role[])
);
create policy units_delete_staff on public.academy_units for delete using (
  public.has_academy_role(academy_id, array['owner','administrator']::public.member_role[])
);

create policy members_select on public.academy_members for select using (public.is_academy_member(academy_id));
create policy members_insert_staff on public.academy_members for insert with check (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);
create policy members_update_staff on public.academy_members for update using (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);

create policy classes_select on public.classes for select using (public.is_academy_member(academy_id));
create policy classes_write on public.classes for all using (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
) with check (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);

create policy schedules_select on public.class_schedules for select using (
  exists (select 1 from public.classes c where c.id = class_id and public.is_academy_member(c.academy_id))
);
create policy schedules_write on public.class_schedules for all using (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(c.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
) with check (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(c.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
);

create policy sessions_select on public.class_sessions for select using (
  exists (select 1 from public.classes c where c.id = class_id and public.is_academy_member(c.academy_id))
);
create policy sessions_write on public.class_sessions for all using (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(
        c.academy_id,
        array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
      )
  )
) with check (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(
        c.academy_id,
        array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
      )
  )
);

create policy att_req_select on public.attendance_requests for select using (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_id and public.is_academy_member(c.academy_id)
  )
);
create policy att_req_insert on public.attendance_requests for insert with check (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    join public.academy_members m on m.id = student_id
    where s.id = session_id
      and m.profile_id = auth.uid()
      and m.academy_id = c.academy_id
      and public.is_academy_member(c.academy_id)
  )
);
create policy att_req_update on public.attendance_requests for update using (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_id
      and public.has_academy_role(c.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
);

create policy att_rec_select on public.attendance_records for select using (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_id and public.is_academy_member(c.academy_id)
  )
);
create policy att_rec_insert on public.attendance_records for insert with check (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    join public.academy_members m on m.id = student_id
    where s.id = session_id
      and m.academy_id = c.academy_id
      and public.has_academy_role(
        c.academy_id,
        array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
      )
  )
);

create policy grad_select on public.graduation_history for select using (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id and public.is_academy_member(m.academy_id)
  )
);
create policy grad_insert on public.graduation_history for insert with check (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and public.has_academy_role(m.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
);

create policy ann_select on public.announcements for select using (public.is_academy_member(academy_id));
create policy ann_write on public.announcements for all using (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
) with check (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);

create policy notif_own on public.notifications for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy belt_levels_read on public.belt_levels for select using (auth.uid() is not null);

insert into public.belt_levels (name, "order") values
  ('Branca',1),('Cinza',2),('Amarela',3),('Laranja',4),('Verde',5),
  ('Azul',6),('Roxa',7),('Marrom',8),('Preta',9),('Coral',10),('Vermelha',11);

-- NOTE: Enable Realtime for public.attendance_requests in the Supabase Dashboard
-- (Database → Replication → attendance_requests). Cannot be done via this SQL alone.
