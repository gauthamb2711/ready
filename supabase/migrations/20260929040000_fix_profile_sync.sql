-- ==============================================================================
-- READY Platform - Profile Synchronization & Foreign Key Integrity Fix
-- ==============================================================================
-- Ensures that every authenticated user in auth.users is guaranteed to have
-- a matching parent record in public.profiles, preventing foreign-key violations
-- in student_subjects and child tables.

-- 0. Fix ambiguous parameter collision in is_platform_admin helper function
create or replace function public.is_platform_admin(user_id uuid)
returns boolean as $$
begin
    if $1 is null then
        return false;
    end if;
    return exists (
        select 1 from public.user_roles ur
        where ur.user_id = $1 and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
    );
end;
$$ language plpgsql security definer set search_path = public;

-- 1. Resilient, fail-safe trigger function on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_account_type public.account_type;
    v_first_name text;
    v_last_name text;
    v_display_name text;
    v_initial_state public.account_state;
    v_raw_type text;
begin
    -- Extract metadata safely
    v_first_name := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
    v_last_name := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
    v_raw_type := new.raw_user_meta_data->>'account_type';

    -- Validate account_type safely against enum values
    if v_raw_type in ('STUDENT', 'CANDIDATE', 'PROFESSIONAL', 'TEACHER', 'COLLEGE_UNIVERSITY', 'COMPANY') then
        v_account_type := v_raw_type::public.account_type;
    else
        v_account_type := 'STUDENT'::public.account_type;
    end if;

    -- Compute display name fallback
    if v_first_name is not null and v_last_name is not null then
        v_display_name := v_first_name || ' ' || v_last_name;
    elsif v_first_name is not null then
        v_display_name := v_first_name;
    elsif new.email is not null then
        v_display_name := split_part(new.email, '@', 1);
    else
        v_display_name := 'Learner';
    end if;

    -- Determine initial state
    if v_account_type in ('TEACHER', 'COLLEGE_UNIVERSITY', 'COMPANY') then
        v_initial_state := 'PENDING'::public.account_state;
    else
        v_initial_state := 'ACTIVE'::public.account_state;
    end if;

    -- Insert or update profile idempotently
    insert into public.profiles (
        id,
        email,
        first_name,
        last_name,
        display_name,
        account_type,
        account_state,
        created_at,
        updated_at
    ) values (
        new.id,
        coalesce(new.email, ''),
        v_first_name,
        v_last_name,
        v_display_name,
        v_account_type,
        v_initial_state,
        now(),
        now()
    )
    on conflict (id) do update set
        email = coalesce(nullif(excluded.email, ''), public.profiles.email),
        first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name = coalesce(excluded.last_name, public.profiles.last_name),
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = now();

    -- Assign basic initial role (non-privileged)
    insert into public.user_roles (
        user_id,
        role
    ) values (
        new.id,
        case 
            when v_account_type = 'CANDIDATE' then 'CANDIDATE'::public.system_role
            when v_account_type = 'PROFESSIONAL' then 'PROFESSIONAL'::public.system_role
            else 'STUDENT'::public.system_role
        end
    )
    on conflict do nothing;

    return new;
exception
    when others then
        -- Fail open on trigger so user registration is not blocked, but log warning
        raise warning 'handle_new_user trigger exception for user %: %', new.id, SQLERRM;
        return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

-- Recreate trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 2. RPC function to safely ensure current user profile exists (Self-Healing)
create or replace function public.ensure_current_user_profile()
returns public.profiles as $$
declare
    v_user auth.users%rowtype;
    v_profile public.profiles%rowtype;
    v_account_type public.account_type;
    v_first_name text;
    v_last_name text;
    v_display_name text;
    v_initial_state public.account_state;
    v_raw_type text;
begin
    -- 1. Check if profile already exists for caller
    select * into v_profile from public.profiles where id = auth.uid();
    if found then
        return v_profile;
    end if;

    -- 2. Retrieve user record from auth.users
    select * into v_user from auth.users where id = auth.uid();
    if not found then
        raise exception 'Authenticated user not found in auth.users';
    end if;

    -- 3. Extract metadata
    v_first_name := nullif(trim(coalesce(v_user.raw_user_meta_data->>'first_name', '')), '');
    v_last_name := nullif(trim(coalesce(v_user.raw_user_meta_data->>'last_name', '')), '');
    v_raw_type := v_user.raw_user_meta_data->>'account_type';

    if v_raw_type in ('STUDENT', 'CANDIDATE', 'PROFESSIONAL', 'TEACHER', 'COLLEGE_UNIVERSITY', 'COMPANY') then
        v_account_type := v_raw_type::public.account_type;
    else
        v_account_type := 'STUDENT'::public.account_type;
    end if;

    if v_first_name is not null and v_last_name is not null then
        v_display_name := v_first_name || ' ' || v_last_name;
    elsif v_first_name is not null then
        v_display_name := v_first_name;
    elsif v_user.email is not null then
        v_display_name := split_part(v_user.email, '@', 1);
    else
        v_display_name := 'Learner';
    end if;

    if v_account_type in ('TEACHER', 'COLLEGE_UNIVERSITY', 'COMPANY') then
        v_initial_state := 'PENDING'::public.account_state;
    else
        v_initial_state := 'ACTIVE'::public.account_state;
    end if;

    -- 4. Insert missing profile
    insert into public.profiles (
        id,
        email,
        first_name,
        last_name,
        display_name,
        account_type,
        account_state,
        created_at,
        updated_at
    ) values (
        v_user.id,
        coalesce(v_user.email, ''),
        v_first_name,
        v_last_name,
        v_display_name,
        v_account_type,
        v_initial_state,
        now(),
        now()
    )
    on conflict (id) do update set
        email = coalesce(nullif(excluded.email, ''), public.profiles.email),
        updated_at = now()
    returning * into v_profile;

    -- 5. Ensure initial role in user_roles
    insert into public.user_roles (
        user_id,
        role
    ) values (
        v_user.id,
        case 
            when v_account_type = 'CANDIDATE' then 'CANDIDATE'::public.system_role
            when v_account_type = 'PROFESSIONAL' then 'PROFESSIONAL'::public.system_role
            else 'STUDENT'::public.system_role
        end
    )
    on conflict do nothing;

    return v_profile;
end;
$$ language plpgsql security definer set search_path = public, auth;

-- Grant execution to authenticated users
grant execute on function public.ensure_current_user_profile() to authenticated;

-- 3. Safe Backfill: Sync any existing auth.users missing from public.profiles
insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    account_type,
    account_state,
    created_at,
    updated_at
)
select 
    u.id,
    coalesce(u.email, ''),
    coalesce(u.raw_user_meta_data->>'first_name', ''),
    coalesce(u.raw_user_meta_data->>'last_name', ''),
    coalesce(
        nullif(trim(coalesce(u.raw_user_meta_data->>'first_name', '') || ' ' || coalesce(u.raw_user_meta_data->>'last_name', '')), ''),
        split_part(coalesce(u.email, ''), '@', 1),
        'Learner'
    ),
    case 
        when u.raw_user_meta_data->>'account_type' in ('STUDENT', 'CANDIDATE', 'PROFESSIONAL', 'TEACHER', 'COLLEGE_UNIVERSITY', 'COMPANY') 
        then (u.raw_user_meta_data->>'account_type')::public.account_type 
        else 'STUDENT'::public.account_type 
    end,
    'ACTIVE'::public.account_state,
    coalesce(u.created_at, now()),
    now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 4. Backfill missing roles for any users in auth.users
insert into public.user_roles (user_id, role)
select 
    u.id,
    case 
        when u.raw_user_meta_data->>'account_type' = 'CANDIDATE' then 'CANDIDATE'::public.system_role
        when u.raw_user_meta_data->>'account_type' = 'PROFESSIONAL' then 'PROFESSIONAL'::public.system_role
        else 'STUDENT'::public.system_role
    end
from auth.users u
left join public.user_roles ur on ur.user_id = u.id
where ur.id is null
on conflict do nothing;
