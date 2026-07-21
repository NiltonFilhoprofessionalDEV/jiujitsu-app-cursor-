-- Per-academy classes required for each degree on a belt (same count for all 4 degrees)

create table if not exists public.academy_belt_requirements (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  belt text not null,
  classes_per_degree integer not null check (classes_per_degree >= 1 and classes_per_degree <= 500),
  updated_at timestamptz not null default now(),
  unique (academy_id, belt)
);

create index if not exists academy_belt_requirements_academy_id_idx
  on public.academy_belt_requirements (academy_id);

alter table public.academy_belt_requirements enable row level security;

drop policy if exists academy_belt_requirements_select on public.academy_belt_requirements;
create policy academy_belt_requirements_select on public.academy_belt_requirements
  for select using (public.is_academy_member(academy_id));

drop policy if exists academy_belt_requirements_write on public.academy_belt_requirements;
create policy academy_belt_requirements_write on public.academy_belt_requirements
  for all using (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor']::public.member_role[]
    )
  )
  with check (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor']::public.member_role[]
    )
  );

-- Dedupe professor alerts when a student becomes eligible
create table if not exists public.graduation_eligibility_alerts (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  kind text not null check (kind in ('degree', 'belt')),
  target_belt text not null,
  target_degree integer not null check (target_degree >= 0 and target_degree <= 10),
  classes_at_alert integer not null default 0,
  created_at timestamptz not null default now(),
  unique (member_id, kind, target_belt, target_degree)
);

create index if not exists graduation_eligibility_alerts_academy_id_idx
  on public.graduation_eligibility_alerts (academy_id);

alter table public.graduation_eligibility_alerts enable row level security;

drop policy if exists graduation_eligibility_alerts_select on public.graduation_eligibility_alerts;
create policy graduation_eligibility_alerts_select on public.graduation_eligibility_alerts
  for select using (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor']::public.member_role[]
    )
  );

drop policy if exists graduation_eligibility_alerts_write on public.graduation_eligibility_alerts;
create policy graduation_eligibility_alerts_write on public.graduation_eligibility_alerts
  for all using (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor']::public.member_role[]
    )
  )
  with check (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor']::public.member_role[]
    )
  );
