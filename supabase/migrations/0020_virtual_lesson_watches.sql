-- Track watched virtual lessons per academy member

create table public.virtual_lesson_watches (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.virtual_lessons(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  watched_at timestamptz not null default now(),
  unique (lesson_id, member_id)
);

create index virtual_lesson_watches_member_id_idx
  on public.virtual_lesson_watches (member_id);

create index virtual_lesson_watches_lesson_id_idx
  on public.virtual_lesson_watches (lesson_id);

alter table public.virtual_lesson_watches enable row level security;

create policy virtual_lesson_watches_select on public.virtual_lesson_watches
  for select using (
    member_id = public.current_academy_member_id(
      (select vl.academy_id from public.virtual_lessons vl where vl.id = lesson_id)
    )
    or exists (
      select 1 from public.virtual_lessons vl
      where vl.id = lesson_id
        and public.has_academy_role(
          vl.academy_id,
          array['owner', 'administrator', 'instructor']::public.member_role[]
        )
    )
  );

create policy virtual_lesson_watches_insert on public.virtual_lesson_watches
  for insert with check (
    member_id = public.current_academy_member_id(
      (select vl.academy_id from public.virtual_lessons vl where vl.id = lesson_id)
    )
    and exists (
      select 1 from public.virtual_lessons vl
      where vl.id = lesson_id
        and public.is_academy_member(vl.academy_id)
    )
  );

create policy virtual_lesson_watches_update on public.virtual_lesson_watches
  for update using (
    member_id = public.current_academy_member_id(
      (select vl.academy_id from public.virtual_lessons vl where vl.id = lesson_id)
    )
  );
