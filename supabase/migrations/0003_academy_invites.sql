-- Academy invite links (WhatsApp / shareable)

create table public.academy_invites (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  token text not null unique,
  role public.member_role not null default 'student',
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  max_uses int not null default 100 check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint academy_invites_role_allowed check (
    role in ('student', 'guardian', 'assistant_instructor', 'instructor')
  )
);

create index academy_invites_academy_id_idx on public.academy_invites (academy_id);
create index academy_invites_token_idx on public.academy_invites (token);

alter table public.academy_invites enable row level security;

create policy invites_select_staff on public.academy_invites
  for select using (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
  );

create policy invites_insert_staff on public.academy_invites
  for insert with check (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
    and created_by = auth.uid()
  );

create policy invites_update_staff on public.academy_invites
  for update using (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
  );

-- Public preview (no membership required)
create or replace function public.get_invite_preview(p_token text)
returns table (
  academy_name text,
  role public.member_role,
  expires_at timestamptz,
  is_valid boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.academy_invites%rowtype;
  v_name text;
begin
  select * into v_invite
  from public.academy_invites
  where token = p_token;

  if not found then
    return;
  end if;

  select a.name into v_name
  from public.academies a
  where a.id = v_invite.academy_id;

  academy_name := v_name;
  role := v_invite.role;
  expires_at := v_invite.expires_at;
  is_valid :=
    v_invite.is_active
    and v_invite.expires_at > now()
    and v_invite.used_count < v_invite.max_uses;

  return next;
end;
$$;

revoke all on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- Accept invite (authenticated)
create or replace function public.accept_academy_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.academy_invites%rowtype;
  v_member_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
  from public.academy_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  if not v_invite.is_active then
    raise exception 'invite_inactive';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'invite_expired';
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'invite_exhausted';
  end if;

  if v_invite.role = 'owner' or v_invite.role = 'administrator' then
    raise exception 'invite_role_forbidden';
  end if;

  select id into v_member_id
  from public.academy_members
  where academy_id = v_invite.academy_id
    and profile_id = v_uid;

  if v_member_id is not null then
    -- Already a member: reactivate if needed, do not consume invite again
    update public.academy_members
    set status = 'active',
        updated_at = now()
    where id = v_member_id
      and status <> 'active';
  else
    insert into public.academy_members (academy_id, profile_id, role, status)
    values (v_invite.academy_id, v_uid, v_invite.role, 'active');

    update public.academy_invites
    set used_count = used_count + 1
    where id = v_invite.id;
  end if;

  return v_invite.academy_id;
end;
$$;

revoke all on function public.accept_academy_invite(text) from public;
grant execute on function public.accept_academy_invite(text) to authenticated;
