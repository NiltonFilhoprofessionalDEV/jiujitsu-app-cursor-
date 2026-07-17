-- Owner invites: only users with can_create_academy (via invite) can create an academy.

alter table public.profiles
  add column if not exists can_create_academy boolean not null default false;

create or replace function public.enforce_can_create_academy_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.can_create_academy is distinct from old.can_create_academy
     and current_user = 'authenticated' then
    raise exception 'cannot_change_can_create_academy';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_can_create_academy on public.profiles;
create trigger trg_profiles_can_create_academy
  before update on public.profiles
  for each row
  execute function public.enforce_can_create_academy_immutable();

create table if not exists public.owner_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_by uuid references public.profiles(id),
  expires_at timestamptz not null,
  max_uses int not null default 1 check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint owner_invites_uses_ok check (used_count <= max_uses)
);

create index if not exists owner_invites_token_idx on public.owner_invites (token);

alter table public.owner_invites enable row level security;

-- No direct client access; use RPCs / service role.
revoke all on table public.owner_invites from public, anon, authenticated;

create or replace function public.get_owner_invite_preview(p_token text)
returns table (
  expires_at timestamptz,
  is_valid boolean
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

  update public.profiles
  set can_create_academy = true,
      updated_at = now()
  where id = v_uid;

  update public.owner_invites
  set used_count = used_count + 1
  where id = v_invite.id;

  return true;
end;
$$;

revoke all on function public.accept_owner_invite(text) from public;
grant execute on function public.accept_owner_invite(text) to authenticated;

create or replace function public.create_academy_with_owner(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_instagram text default null,
  p_city text default null,
  p_state text default null,
  p_address text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_academy_id uuid;
  v_uid uuid := auth.uid();
  v_allowed boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select can_create_academy into v_allowed
  from public.profiles
  where id = v_uid;

  if coalesce(v_allowed, false) is not true then
    raise exception 'academy_create_forbidden';
  end if;

  insert into public.academies (name, phone, email, instagram, city, state, address, description)
  values (p_name, p_phone, p_email, p_instagram, p_city, p_state, p_address, p_description)
  returning id into v_academy_id;

  insert into public.academy_members (academy_id, profile_id, role, status)
  values (v_academy_id, v_uid, 'owner', 'active');

  update public.profiles
  set can_create_academy = false,
      updated_at = now()
  where id = v_uid;

  return v_academy_id;
end;
$$;

revoke all on function public.create_academy_with_owner from public;
grant execute on function public.create_academy_with_owner to authenticated;
