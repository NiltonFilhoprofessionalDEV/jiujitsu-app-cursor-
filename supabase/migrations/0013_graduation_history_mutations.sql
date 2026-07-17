-- Allow staff with graduate capability roles to correct graduation mistakes.
create policy grad_update on public.graduation_history for update using (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and public.has_academy_role(
        m.academy_id,
        array['owner','administrator','instructor']::public.member_role[]
      )
  )
)
with check (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and public.has_academy_role(
        m.academy_id,
        array['owner','administrator','instructor']::public.member_role[]
      )
  )
);

create policy grad_delete on public.graduation_history for delete using (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and public.has_academy_role(
        m.academy_id,
        array['owner','administrator','instructor']::public.member_role[]
      )
  )
);
