-- Manual member creation (pending profile) + personal invite claim

alter table public.academy_members
  alter column profile_id drop not null;

alter table public.academy_members
  add column if not exists pending_name text,
  add column if not exists pending_email text,
  add column if not exists pending_phone text;

alter table public.academy_members
  drop constraint if exists academy_members_academy_id_profile_id_key;

create unique index if not exists academy_members_academy_profile_uidx
  on public.academy_members (academy_id, profile_id)
  where profile_id is not null;

alter table public.academy_members
  add constraint academy_members_profile_or_pending check (
    profile_id is not null
    or (pending_name is not null and length(trim(pending_name)) > 0)
  );

alter table public.academy_invites
  add column if not exists target_member_id uuid
    references public.academy_members(id) on delete cascade;

create index if not exists academy_invites_target_member_id_idx
  on public.academy_invites (target_member_id);

drop function if exists public.get_invite_preview(text);

create or replace function public.get_invite_preview(p_token text)
returns table (
  academy_name text,
  role public.member_role,
  expires_at timestamptz,
  is_valid boolean,
  invitee_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.academy_invites%rowtype;
  v_name text;
  v_invitee text;
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

  if v_invite.target_member_id is not null then
    select coalesce(p.name, m.pending_name) into v_invitee
    from public.academy_members m
    left join public.profiles p on p.id = m.profile_id
    where m.id = v_invite.target_member_id;
  end if;

  academy_name := v_name;
  role := v_invite.role;
  expires_at := v_invite.expires_at;
  is_valid :=
    v_invite.is_active
    and v_invite.expires_at > now()
    and v_invite.used_count < v_invite.max_uses;
  invitee_name := v_invitee;

  return next;
end;
$$;

revoke all on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- Accept: claim pending member when invite is personal
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
  v_existing_same uuid;
  v_target public.academy_members%rowtype;
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

  -- Already linked to this academy?
  select id into v_member_id
  from public.academy_members
  where academy_id = v_invite.academy_id
    and profile_id = v_uid;

  if v_member_id is not null then
    update public.academy_members
    set status = 'active',
        updated_at = now()
    where id = v_member_id
      and status <> 'active';

    -- Consume personal invite if still open
    if v_invite.target_member_id is not null
       and v_invite.used_count < v_invite.max_uses then
      update public.academy_invites
      set used_count = used_count + 1,
          is_active = case
            when used_count + 1 >= max_uses then false
            else is_active
          end
      where id = v_invite.id;
    end if;

    return v_invite.academy_id;
  end if;

  -- Personal invite: claim the pending roster row
  if v_invite.target_member_id is not null then
    select * into v_target
    from public.academy_members
    where id = v_invite.target_member_id
      and academy_id = v_invite.academy_id
    for update;

    if not found then
      raise exception 'invite_member_missing';
    end if;

    if v_target.profile_id is not null and v_target.profile_id <> v_uid then
      raise exception 'invite_already_claimed';
    end if;

    if v_target.profile_id = v_uid then
      update public.academy_members
      set status = 'active',
          updated_at = now()
      where id = v_target.id;

      update public.academy_invites
      set used_count = used_count + 1,
          is_active = false
      where id = v_invite.id;

      return v_invite.academy_id;
    end if;

    -- Seed profile phone/name from pending before clearing
    update public.profiles p
    set
      name = case
        when coalesce(trim(p.name), '') = ''
          then coalesce(v_target.pending_name, p.name)
        else p.name
      end,
      phone = coalesce(nullif(trim(p.phone), ''), v_target.pending_phone, p.phone),
      updated_at = now()
    where p.id = v_uid;

    update public.academy_members
    set profile_id = v_uid,
        status = 'active',
        role = v_invite.role,
        pending_name = null,
        pending_email = null,
        pending_phone = null,
        updated_at = now()
    where id = v_target.id;

    update public.academy_invites
    set used_count = used_count + 1,
        is_active = false
    where id = v_invite.id;

    return v_invite.academy_id;
  end if;

  -- Generic multi-use invite (legacy)
  insert into public.academy_members (academy_id, profile_id, role, status)
  values (v_invite.academy_id, v_uid, v_invite.role, 'active');

  update public.academy_invites
  set used_count = used_count + 1
  where id = v_invite.id;

  return v_invite.academy_id;
end;
$$;

revoke all on function public.accept_academy_invite(text) from public;
grant execute on function public.accept_academy_invite(text) to authenticated;
