-- Dedupe table for staff birthday notifications (cron-only writes via service role)

create table public.birthday_notifications_sent (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  birthday_profile_id uuid not null references public.profiles(id) on delete cascade,
  staff_profile_id uuid not null references public.profiles(id) on delete cascade,
  for_date date not null,
  created_at timestamptz not null default now(),
  unique (academy_id, birthday_profile_id, staff_profile_id, for_date)
);

create index birthday_notifications_sent_academy_date_idx
  on public.birthday_notifications_sent (academy_id, for_date);

alter table public.birthday_notifications_sent enable row level security;

-- No client policies: only service role (cron) reads/writes this table.
