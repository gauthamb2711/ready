-- ==============================================================================
-- READY Platform - Fix Organization Members RLS Infinite Recursion
-- ==============================================================================
-- Resolves circular dependency in public.organization_members policies by:
-- 1. Using SECURITY DEFINER helper function public.is_org_admin() with search_path = public
-- 2. Ensuring public.is_org_member() has search_path = public
-- 3. Splitting and replacing recursive inline subqueries on organization_members
-- 4. Granting Platform Admins explicit, direct non-recursive access
-- ==============================================================================

-- 1. Helper function: is_org_admin (SECURITY DEFINER bypasses RLS on organization_members to prevent recursion)
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
          and om.role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN', 'ORGANIZATION_OWNER')
          and om.status = 'ACTIVE'
    );
end;
$$ language plpgsql security definer set search_path = public;

-- Ensure is_org_member has search_path = public
create or replace function public.is_org_member(target_org_id uuid, target_user_id uuid)
returns boolean as $$
begin
    if target_org_id is null or target_user_id is null then
        return false;
    end if;

    return exists (
        select 1 from public.organization_members
        where organization_id = $1 and user_id = $2 and status = 'ACTIVE'
    );
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Drop existing recursive policies on organization_members
drop policy if exists "Org admins can manage memberships" on public.organization_members;
drop policy if exists "Org members can view peer memberships" on public.organization_members;
drop policy if exists "Platform admin full access to organization members" on public.organization_members;
drop policy if exists "Org members and admins can view memberships" on public.organization_members;
drop policy if exists "Org admins can manage org members" on public.organization_members;

-- 3. Create non-recursive, least-privilege policies for organization_members

-- A. Platform Admin Full Access (Non-recursive: checks public.user_roles via is_platform_admin)
create policy "Platform admin full access to organization members"
    on public.organization_members for all
    using (public.is_platform_admin(auth.uid()))
    with check (public.is_platform_admin(auth.uid()));

-- B. Organization Admin Management (Uses SECURITY DEFINER function to eliminate recursion)
create policy "Org admins can manage org members"
    on public.organization_members for all
    using (public.is_org_admin(organization_id, auth.uid()))
    with check (public.is_org_admin(organization_id, auth.uid()));

-- C. Members & Users Read Access (Users can view their own membership + peer members can view active roster)
create policy "Org members can view peer memberships"
    on public.organization_members for select
    using (
        user_id = auth.uid() or
        public.is_platform_admin(auth.uid()) or
        public.is_org_admin(organization_id, auth.uid()) or
        public.is_org_member(organization_id, auth.uid())
    );

-- 4. Update organization_membership_requests policies to use is_org_admin helper instead of inline subqueries
drop policy if exists "org_membership_requests_user_select" on public.organization_membership_requests;
drop policy if exists "org_membership_requests_admin_update" on public.organization_membership_requests;

create policy "org_membership_requests_user_select"
    on public.organization_membership_requests for select
    using (
        user_id = auth.uid() or
        public.is_platform_admin(auth.uid()) or
        public.is_org_admin(organization_id, auth.uid())
    );

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

-- 5. Allow Platform Admin to update user profile account states upon organization verification
drop policy if exists "Platform admin can update profiles" on public.profiles;
create policy "Platform admin can update profiles"
    on public.profiles for update
    using (public.is_platform_admin(auth.uid()))
    with check (public.is_platform_admin(auth.uid()));

