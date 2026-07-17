-- Cancel / substitute a single training day without changing the weekly grade.

create table if not exists public.class_schedule_day_overrides (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  schedule_id uuid not null references public.class_schedules(id) on delete cascade,
  date date not null,
  cancelled boolean not null default false,
  substitute_instructor_id uuid references public.academy_members(id) on delete set null,
  note text,
  created_by uuid references public.academy_members(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint class_schedule_day_overrides_action_check
    check (cancelled = true or substitute_instructor_id is not null),
  constraint class_schedule_day_overrides_unique unique (schedule_id, date)
);

create index if not exists class_schedule_day_overrides_class_date_idx
  on public.class_schedule_day_overrides (class_id, date);

create index if not exists class_schedule_day_overrides_schedule_date_idx
  on public.class_schedule_day_overrides (schedule_id, date);

alter table public.class_schedule_day_overrides enable row level security;

create policy class_schedule_day_overrides_select on public.class_schedule_day_overrides
  for select using (public.is_academy_member(academy_id));

create policy class_schedule_day_overrides_insert on public.class_schedule_day_overrides
  for insert with check (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
    )
  );

create policy class_schedule_day_overrides_update on public.class_schedule_day_overrides
  for update using (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
    )
  ) with check (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
    )
  );

create policy class_schedule_day_overrides_delete on public.class_schedule_day_overrides
  for delete using (
    public.has_academy_role(
      academy_id,
      array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
    )
  );
