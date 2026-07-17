-- Per-user announcement read receipts

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);

create index announcement_reads_profile_id_idx
  on public.announcement_reads (profile_id);

alter table public.announcement_reads enable row level security;

create policy announcement_reads_select_own on public.announcement_reads
  for select using (profile_id = auth.uid());

create policy announcement_reads_insert_own on public.announcement_reads
  for insert with check (profile_id = auth.uid());

create policy announcement_reads_delete_own on public.announcement_reads
  for delete using (profile_id = auth.uid());
