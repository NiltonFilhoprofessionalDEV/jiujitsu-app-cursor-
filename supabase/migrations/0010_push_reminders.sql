-- Web Push subscriptions + reminder dedupe log

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, endpoint)
);

create index push_subscriptions_profile_id_idx
  on public.push_subscriptions (profile_id);

create table public.class_reminder_log (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.class_schedules(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  remind_date date not null,
  created_at timestamptz not null default now(),
  unique (schedule_id, profile_id, remind_date)
);

create index class_reminder_log_remind_date_idx
  on public.class_reminder_log (remind_date);

alter table public.push_subscriptions enable row level security;
alter table public.class_reminder_log enable row level security;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select using (profile_id = auth.uid());

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert with check (profile_id = auth.uid());

create policy push_subscriptions_update_own on public.push_subscriptions
  for update using (profile_id = auth.uid());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete using (profile_id = auth.uid());

-- Reminder log is written by service role / cron only
create policy class_reminder_log_deny_all on public.class_reminder_log
  for all using (false);
