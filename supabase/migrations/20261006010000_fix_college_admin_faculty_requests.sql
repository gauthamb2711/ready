-- ==============================================================================
-- READY Platform - Fix College Admin Teacher Join Request Visibility & Approval
-- ==============================================================================
-- Resolves:
-- 1. is_org_admin enum casting error (ORGANIZATION_OWNER not in system_role enum)
-- 2. organization_membership_requests missing created_at column and work_email nullability
-- 3. RLS policies on organization_membership_requests ensuring College Admin
--    can see and manage pending teacher requests for their own organization only
-- ==============================================================================

-- 1. Fix is_org_admin security definer helper function
create or replace function public.is_org_admin(p_org_id uuid, p_user_id uuid)
returns boolean as $$
begin
    if p_org_id is null or p_user_id is null then
        return false;
    end if;

    return exists (
        select 1 from public.organization_members om
        where om.organization_id = p_org_id
          and om.user_id = p_user_id
          and om.role::text in ('COLLEGE_ADMIN', 'COMPANY_ADMIN', 'DEPARTMENT_ADMIN', 'ORGANIZATION_OWNER')
          and om.status = 'ACTIVE'
    ) or exists (
        select 1 from public.organizations o
        where o.id = p_org_id
          and o.created_by = p_user_id
          and o.verification_status = 'VERIFIED'
    );
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Update schema of organization_membership_requests and organization_members
-- Ensure created_at exists alongside submitted_at
alter table public.organization_membership_requests 
    add column if not exists created_at timestamptz default now();

update public.organization_membership_requests 
    set created_at = coalesce(submitted_at, now()) 
    where created_at is null;

-- Ensure created_at exists on organization_members
alter table public.organization_members 
    add column if not exists created_at timestamptz default now();

update public.organization_members 
    set created_at = coalesce(joined_at, now()) 
    where created_at is null;

-- Ensure work_email is not strictly blocking if omitted
alter table public.organization_membership_requests 
    alter column work_email drop not null;

alter table public.organization_membership_requests 
    alter column work_email set default '';

-- 3. Refresh RLS policies on organization_membership_requests
drop policy if exists "org_membership_requests_user_select" on public.organization_membership_requests;
drop policy if exists "org_membership_requests_user_insert" on public.organization_membership_requests;
drop policy if exists "org_membership_requests_admin_update" on public.organization_membership_requests;
drop policy if exists "org_membership_requests_admin_delete" on public.organization_membership_requests;

-- A. SELECT: Users can view their own requests, Platform Admins can view all,
--    College Admins can view only requests for their own organization
create policy "org_membership_requests_user_select"
    on public.organization_membership_requests for select
    using (
        user_id = auth.uid() or
        public.is_platform_admin(auth.uid()) or
        public.is_org_admin(organization_id, auth.uid())
    );

-- B. INSERT: Authenticated users can submit membership requests for themselves,
--    or Platform Admins can insert
create policy "org_membership_requests_user_insert"
    on public.organization_membership_requests for insert
    with check (
        user_id = auth.uid() or
        public.is_platform_admin(auth.uid())
    );

-- C. UPDATE: Platform Admins and College Admins for that organization can update (approve/reject)
create policy "org_membership_requests_admin_update"
    on public.organization_membership_requests for update
    using (
        public.is_platform_admin(auth.uid()) or
        public.is_org_admin(organization_id, auth.uid())
    )
    with check (
        public.is_platform_admin(auth.uid()) or
        public.is_org_admin(organization_id, auth.uid())
    );

-- D. DELETE: Platform Admins and College Admins for that organization can delete
create policy "org_membership_requests_admin_delete"
    on public.organization_membership_requests for delete
    using (
        public.is_platform_admin(auth.uid()) or
        public.is_org_admin(organization_id, auth.uid())
    );

-- 4. Safe SECURITY DEFINER helper and policy allowing Org Admins to view member and applicant profiles
create or replace function public.is_org_admin_for_user(p_admin_id uuid, p_target_user_id uuid)
returns boolean as $$
begin
    if p_admin_id is null or p_target_user_id is null then
        return false;
    end if;

    -- Case 1: Target user is an applicant to an organization administered by p_admin_id
    if exists (
        select 1 from public.organization_membership_requests omr
        where omr.user_id = p_target_user_id
          and public.is_org_admin(omr.organization_id, p_admin_id)
    ) then
        return true;
    end if;

    -- Case 2: Target user is a member in an organization administered by p_admin_id
    if exists (
        select 1 from public.organization_members om
        where om.user_id = p_target_user_id
          and public.is_org_admin(om.organization_id, p_admin_id)
    ) then
        return true;
    end if;

    return false;
end;
$$ language plpgsql security definer set search_path = public;

drop policy if exists "Org admins can view member and applicant profiles" on public.profiles;
create policy "Org admins can view member and applicant profiles"
    on public.profiles for select
    using (
        public.is_org_admin_for_user(auth.uid(), id)
    );

