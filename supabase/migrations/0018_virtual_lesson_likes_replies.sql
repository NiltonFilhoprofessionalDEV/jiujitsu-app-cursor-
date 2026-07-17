-- Video likes + threaded comment replies (YouTube-style)

create table public.virtual_lesson_likes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.virtual_lessons(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lesson_id, member_id)
);

create index virtual_lesson_likes_lesson_id_idx
  on public.virtual_lesson_likes (lesson_id);

create index virtual_lesson_likes_member_id_idx
  on public.virtual_lesson_likes (member_id);

alter table public.virtual_lesson_comments
  add column parent_id uuid references public.virtual_lesson_comments(id) on delete cascade;

create index virtual_lesson_comments_parent_id_idx
  on public.virtual_lesson_comments (parent_id, created_at);

alter table public.virtual_lesson_likes enable row level security;

create policy virtual_lesson_likes_select on public.virtual_lesson_likes
  for select using (
    exists (
      select 1 from public.virtual_lessons vl
      where vl.id = lesson_id
        and public.is_academy_member(vl.academy_id)
    )
  );

create policy virtual_lesson_likes_insert on public.virtual_lesson_likes
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

create policy virtual_lesson_likes_delete on public.virtual_lesson_likes
  for delete using (
    member_id = public.current_academy_member_id(
      (select vl.academy_id from public.virtual_lessons vl where vl.id = lesson_id)
    )
  );
