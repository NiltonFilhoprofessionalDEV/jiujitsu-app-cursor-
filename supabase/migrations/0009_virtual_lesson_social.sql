-- Virtual lessons: categories, favorites, comments

create type public.virtual_lesson_category as enum (
  'guarda',
  'passagem',
  'finalizacao',
  'defesa'
);

alter table public.virtual_lessons
  add column category public.virtual_lesson_category;

create table public.virtual_lesson_favorites (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.virtual_lessons(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lesson_id, member_id)
);

create index virtual_lesson_favorites_member_id_idx
  on public.virtual_lesson_favorites (member_id);

create table public.virtual_lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.virtual_lessons(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint virtual_lesson_comments_body_len check (
    char_length(trim(body)) >= 1 and char_length(body) <= 1000
  )
);

create index virtual_lesson_comments_lesson_id_idx
  on public.virtual_lesson_comments (lesson_id, created_at);

alter table public.virtual_lesson_favorites enable row level security;
alter table public.virtual_lesson_comments enable row level security;

-- Favorites: members can manage their own; select if they can see the lesson
create policy virtual_lesson_favorites_select on public.virtual_lesson_favorites
  for select using (
    member_id = public.current_academy_member_id(
      (select vl.academy_id from public.virtual_lessons vl where vl.id = lesson_id)
    )
  );

create policy virtual_lesson_favorites_insert on public.virtual_lesson_favorites
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

create policy virtual_lesson_favorites_delete on public.virtual_lesson_favorites
  for delete using (
    member_id = public.current_academy_member_id(
      (select vl.academy_id from public.virtual_lessons vl where vl.id = lesson_id)
    )
  );

-- Comments: academy members who can see the lesson can read/write
create policy virtual_lesson_comments_select on public.virtual_lesson_comments
  for select using (
    exists (
      select 1 from public.virtual_lessons vl
      where vl.id = lesson_id
        and public.is_academy_member(vl.academy_id)
    )
  );

create policy virtual_lesson_comments_insert on public.virtual_lesson_comments
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

create policy virtual_lesson_comments_delete_own on public.virtual_lesson_comments
  for delete using (
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
