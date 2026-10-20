-- ==============================================================================
-- READY Platform - Fix Signup Ecosystem Role Assignment and Profile Sync
-- ==============================================================================
-- 1. Updates handle_new_user() trigger to correctly map public registration
--    ecosystems to their proper system roles (TEACHER, COLLEGE_ADMIN, COMPANY_ADMIN,
--    CANDIDATE, PROFESSIONAL, STUDENT) while strictly preventing PLATFORM_ADMIN creation.
-- 2. Updates ensure_current_user_profile() RPC to maintain identical role mapping
--    and email normalization during self-healing profile checks.
-- ==============================================================================

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
    v_normalized_email text;
    v_initial_role public.system_role;
begin
    -- Extract and normalize email safely
    v_normalized_email := lower(trim(coalesce(new.email, '')));

    -- Extract metadata safely
    v_first_name := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
    v_last_name := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
    v_raw_type := trim(coalesce(new.raw_user_meta_data->>'account_type', ''));

    -- Validate account_type safely against allowed signup enums (NEVER allow PLATFORM_ADMIN)
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
    elsif v_normalized_email <> '' then
        v_display_name := split_part(v_normalized_email, '@', 1);
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
        v_normalized_email,
        v_first_name,
        v_last_name,
        v_display_name,
        v_account_type,
        v_initial_state,
        now(),
        now()
    )
    on conflict (id) do update set
        email = coalesce(nullif(v_normalized_email, ''), public.profiles.email),
        first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name = coalesce(excluded.last_name, public.profiles.last_name),
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = now();

    -- Determine corresponding system role safely (NEVER PLATFORM_ADMIN)
    case v_account_type
        when 'TEACHER' then v_initial_role := 'TEACHER'::public.system_role;
        when 'COLLEGE_UNIVERSITY' then v_initial_role := 'COLLEGE_ADMIN'::public.system_role;
        when 'COMPANY' then v_initial_role := 'COMPANY_ADMIN'::public.system_role;
        when 'CANDIDATE' then v_initial_role := 'CANDIDATE'::public.system_role;
        when 'PROFESSIONAL' then v_initial_role := 'PROFESSIONAL'::public.system_role;
        else v_initial_role := 'STUDENT'::public.system_role;
    end case;

    -- Assign basic initial role idempotently
    insert into public.user_roles (
        user_id,
        role
    ) values (
        new.id,
        v_initial_role
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
    v_normalized_email text;
    v_initial_role public.system_role;
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

    -- 3. Extract and normalize
    v_normalized_email := lower(trim(coalesce(v_user.email, '')));
    v_first_name := nullif(trim(coalesce(v_user.raw_user_meta_data->>'first_name', '')), '');
    v_last_name := nullif(trim(coalesce(v_user.raw_user_meta_data->>'last_name', '')), '');
    v_raw_type := trim(coalesce(v_user.raw_user_meta_data->>'account_type', ''));

    if v_raw_type in ('STUDENT', 'CANDIDATE', 'PROFESSIONAL', 'TEACHER', 'COLLEGE_UNIVERSITY', 'COMPANY') then
        v_account_type := v_raw_type::public.account_type;
    else
        v_account_type := 'STUDENT'::public.account_type;
    end if;

    if v_first_name is not null and v_last_name is not null then
        v_display_name := v_first_name || ' ' || v_last_name;
    elsif v_first_name is not null then
        v_display_name := v_first_name;
    elsif v_normalized_email <> '' then
        v_display_name := split_part(v_normalized_email, '@', 1);
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
        v_normalized_email,
        v_first_name,
        v_last_name,
        v_display_name,
        v_account_type,
        v_initial_state,
        now(),
        now()
    )
    on conflict (id) do update set
        email = coalesce(nullif(v_normalized_email, ''), public.profiles.email),
        updated_at = now()
    returning * into v_profile;

    -- 5. Determine corresponding system role safely (NEVER PLATFORM_ADMIN)
    case v_account_type
        when 'TEACHER' then v_initial_role := 'TEACHER'::public.system_role;
        when 'COLLEGE_UNIVERSITY' then v_initial_role := 'COLLEGE_ADMIN'::public.system_role;
        when 'COMPANY' then v_initial_role := 'COMPANY_ADMIN'::public.system_role;
        when 'CANDIDATE' then v_initial_role := 'CANDIDATE'::public.system_role;
        when 'PROFESSIONAL' then v_initial_role := 'PROFESSIONAL'::public.system_role;
        else v_initial_role := 'STUDENT'::public.system_role;
    end case;

    -- 6. Ensure initial role in user_roles idempotently
    insert into public.user_roles (
        user_id,
        role
    ) values (
        v_user.id,
        v_initial_role
    )
    on conflict do nothing;

    return v_profile;
end;
$$ language plpgsql security definer set search_path = public, auth;

-- Grant execution to authenticated users
grant execute on function public.ensure_current_user_profile() to authenticated;
