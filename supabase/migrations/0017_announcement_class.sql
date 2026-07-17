-- Scope announcements to a class (nullable = whole academy)

alter table public.announcements
  add column if not exists class_id uuid references public.classes(id) on delete set null;

create index if not exists announcements_class_id_idx
  on public.announcements (class_id);
