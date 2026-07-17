-- Virtual classroom (YouTube lessons) + class roster for class-scoped visibility

create type public.virtual_lesson_orientation as enum ('horizontal', 'vertical');
create type public.virtual_lesson_visibility as enum ('academy', 'class');

create table public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, member_id)
);

create index class_members_class_id_idx on public.class_members (class_id);
create index class_members_member_id_idx on public.class_members (member_id);

create table public.virtual_lessons (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  title text not null,
  description text,
  youtube_url text not null,
  youtube_video_id text not null,
  orientation public.virtual_lesson_orientation not null default 'horizontal',
  class_id uuid references public.classes(id) on delete set null,
  visibility public.virtual_lesson_visibility not null default 'academy',
  is_published boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint virtual_lessons_class_visibility_check check (
    visibility <> 'class' or class_id is not null
  )
);

create index virtual_lessons_academy_id_idx on public.virtual_lessons (academy_id);
create index virtual_lessons_class_id_idx on public.virtual_lessons (class_id);

alter table public.class_members enable row level security;
alter table public.virtual_lessons enable row level security;

-- Helper: viewer's academy_members.id for an academy
create or replace function public.current_academy_member_id(p_academy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select am.id
  from public.academy_members am
  where am.academy_id = p_academy_id
    and am.profile_id = auth.uid()
    and am.status = 'active'
  limit 1;
$$;

revoke all on function public.current_academy_member_id(uuid) from public;
grant execute on function public.current_academy_member_id(uuid) to authenticated;

-- class_members policies
create policy class_members_select on public.class_members
  for select using (
    exists (
      select 1 from public.classes c
      where c.id = class_id
        and public.is_academy_member(c.academy_id)
    )
  );

create policy class_members_insert_staff on public.class_members
  for insert with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id
        and public.has_academy_role(
          c.academy_id,
          array['owner', 'administrator', 'instructor']::public.member_role[]
        )
    )
  );

create policy class_members_delete_staff on public.class_members
  for delete using (
    exists (
      select 1 from public.classes c
      where c.id = class_id
        and public.has_academy_role(
          c.academy_id,
          array['owner', 'administrator', 'instructor']::public.member_role[]
        )
    )
  );

-- virtual_lessons SELECT
create policy virtual_lessons_select on public.virtual_lessons
  for select using (
    public.is_academy_member(academy_id)
    and (
      -- staff (owner/admin/instructor/assistant) see all in academy
      public.has_academy_role(
        academy_id,
        array[
          'owner',
          'administrator',
          'instructor',
          'assistant_instructor'
        ]::public.member_role[]
      )
      or (
        is_published = true
        and (
          visibility = 'academy'
          or (
            visibility = 'class'
            and class_id is not null
            and exists (
              select 1
              from public.class_members cm
              where cm.class_id = virtual_lessons.class_id
                and cm.member_id = public.current_academy_member_id(
                  virtual_lessons.academy_id
                )
            )
          )
        )
      )
    )
  );

create policy virtual_lessons_insert_staff on public.virtual_lessons
  for insert with check (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
    and created_by = auth.uid()
  );

create policy virtual_lessons_update_staff on public.virtual_lessons
  for update using (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
  );

create policy virtual_lessons_delete_staff on public.virtual_lessons
  for delete using (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
  );
