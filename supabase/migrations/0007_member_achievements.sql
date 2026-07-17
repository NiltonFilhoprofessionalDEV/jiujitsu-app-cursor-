-- Member achievements for Minha Jornada trophies

create table public.member_achievements (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  unique (member_id, code)
);

create index member_achievements_member_id_idx
  on public.member_achievements (member_id);

create index member_achievements_academy_id_idx
  on public.member_achievements (academy_id);

alter table public.member_achievements enable row level security;

create policy member_achievements_select_own
  on public.member_achievements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.academy_members am
      where am.id = member_id
        and am.profile_id = auth.uid()
    )
  );

create policy member_achievements_select_staff
  on public.member_achievements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.academy_members am
      where am.academy_id = member_achievements.academy_id
        and am.profile_id = auth.uid()
        and am.status = 'active'
        and am.role in ('owner', 'administrator', 'instructor')
    )
  );

-- Inserts only via service role (server actions). No direct client inserts.
create policy member_achievements_insert_staff
  on public.member_achievements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.academy_members staff
      where staff.academy_id = member_achievements.academy_id
        and staff.profile_id = auth.uid()
        and staff.status = 'active'
        and staff.role in (
          'owner',
          'administrator',
          'instructor',
          'assistant_instructor'
        )
    )
  );
