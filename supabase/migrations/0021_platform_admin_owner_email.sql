-- Bind owner invites to a specific email + academy suspension metadata for platform admin.

alter table public.owner_invites
  add column if not exists expected_email text;

create index if not exists owner_invites_expected_email_idx
  on public.owner_invites (lower(expected_email));

alter table public.academies
  add column if not exists suspension_reason text;

drop function if exists public.get_owner_invite_preview(text);

create function public.get_owner_invite_preview(p_token text)
returns table (
  expires_at timestamptz,
  is_valid boolean,
  expected_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.owner_invites%rowtype;
begin
  select * into v_invite
  from public.owner_invites
  where token = p_token;

  if not found then
    return;
  end if;

  expires_at := v_invite.expires_at;
  is_valid :=
    v_invite.is_active
    and v_invite.expires_at > now()
    and v_invite.used_count < v_invite.max_uses;
  expected_email := nullif(lower(trim(coalesce(v_invite.expected_email, ''))), '');
  return next;
end;
$$;

revoke all on function public.get_owner_invite_preview(text) from public;
grant execute on function public.get_owner_invite_preview(text) to anon, authenticated;

create or replace function public.accept_owner_invite(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.owner_invites%rowtype;
  v_uid uuid := auth.uid();
  v_user_email text;
  v_expected text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
  from public.owner_invites
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

  select lower(trim(email)) into v_user_email
  from auth.users
  where id = v_uid;

  v_expected := nullif(lower(trim(coalesce(v_invite.expected_email, ''))), '');
  if v_expected is not null
     and (v_user_email is null or v_user_email <> v_expected) then
    raise exception 'invite_email_mismatch';
  end if;

  update public.profiles
  set can_create_academy = true,
      updated_at = now()
  where id = v_uid;

  update public.owner_invites
  set used_count = used_count + 1,
      is_active = case
        when used_count + 1 >= max_uses then false
        else is_active
      end
  where id = v_invite.id;

  return true;
end;
$$;

revoke all on function public.accept_owner_invite(text) from public;
grant execute on function public.accept_owner_invite(text) to authenticated;
