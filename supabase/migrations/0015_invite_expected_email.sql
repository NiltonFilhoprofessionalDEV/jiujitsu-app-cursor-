-- Bind personal invites to the email provided by staff (when present).

drop function if exists public.get_invite_preview(text);

create function public.get_invite_preview(p_token text)
returns table (
  academy_name text,
  role public.member_role,
  expires_at timestamptz,
  is_valid boolean,
  invitee_name text,
  expected_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.academy_invites%rowtype;
  v_name text;
  v_invitee text;
  v_email text;
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
    select coalesce(p.name, m.pending_name),
           nullif(lower(trim(coalesce(m.pending_email, ''))), '')
      into v_invitee, v_email
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
  expected_email := v_email;

  return next;
end;
$$;

revoke all on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

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
  v_target public.academy_members%rowtype;
  v_user_email text;
  v_expected text;
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

  select lower(trim(email)) into v_user_email
  from auth.users
  where id = v_uid;

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

  if v_invite.target_member_id is not null then
    select * into v_target
    from public.academy_members
    where id = v_invite.target_member_id
      and academy_id = v_invite.academy_id
    for update;

    if not found then
      raise exception 'invite_member_missing';
    end if;

    v_expected := nullif(lower(trim(coalesce(v_target.pending_email, ''))), '');
    if v_expected is not null
       and (v_user_email is null or v_user_email <> v_expected) then
      raise exception 'invite_email_mismatch';
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
