-- Allow staff to hard-delete members when no blocking FKs remain.
create policy members_delete_staff on public.academy_members for delete using (
  public.has_academy_role(
    academy_id,
    array['owner','administrator','instructor']::public.member_role[]
  )
);
