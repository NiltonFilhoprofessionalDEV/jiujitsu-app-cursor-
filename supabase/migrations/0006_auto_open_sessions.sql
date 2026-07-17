-- Auto-open / auto-close class sessions by schedule
-- Spec: docs/superpowers/specs/2026-07-16-auto-open-sessions-design.md

alter table public.academies
  add column if not exists timezone text not null default 'America/Sao_Paulo';

alter table public.academy_units
  add column if not exists timezone text;

alter table public.classes
  add column if not exists default_instructor_id uuid references public.academy_members(id) on delete set null;

alter table public.class_schedules
  add column if not exists auto_open_enabled boolean not null default false,
  add column if not exists auto_open_lead_minutes int not null default 30
    check (auto_open_lead_minutes between 5 and 120),
  add column if not exists auto_close_grace_minutes int not null default 15
    check (auto_close_grace_minutes between 0 and 60);

alter table public.class_sessions
  add column if not exists schedule_id uuid references public.class_schedules(id) on delete set null;

create unique index if not exists class_sessions_schedule_date_unique
  on public.class_sessions (schedule_id, date)
  where schedule_id is not null;

create index if not exists class_schedules_auto_open_idx
  on public.class_schedules (auto_open_enabled)
  where auto_open_enabled = true;

create index if not exists class_sessions_open_schedule_idx
  on public.class_sessions (status, schedule_id)
  where status = 'open' and schedule_id is not null;
