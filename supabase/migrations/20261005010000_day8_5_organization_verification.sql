-- ==============================================================================
-- READY Platform - Day 8.5 Organization-Aware Teacher Verification
-- & Administrative Control Foundation Migration
-- ==============================================================================
-- Multi-Tenant SaaS Hierarchy:
-- Platform Admin -> Organization Verification -> College Admin -> Faculty Approval -> Teacher
-- ==============================================================================

-- 1. Extend public.organizations with verification_status if not present
alter table public.organizations 
    add column if not exists verification_status text not null default 'PENDING' 
    check (verification_status in ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'REVOKED'));

create index if not exists idx_organizations_verification_status 
    on public.organizations(verification_status);

-- 2. Organization Verifications Table
create table if not exists public.organization_verifications (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    submitted_by uuid not null references public.profiles(id) on delete cascade,
    official_email text not null,
    website_url text,
    document_urls jsonb default '[]'::jsonb,
    status text not null default 'PENDING' check (status in ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'REVOKED')),
    review_notes text,
    reviewed_by uuid references public.profiles(id) on delete set null,
    reviewed_at timestamptz,
    submitted_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_org_verifications_org on public.organization_verifications(organization_id);
create index if not exists idx_org_verifications_status on public.organization_verifications(status);
create index if not exists idx_org_verifications_submitted on public.organization_verifications(submitted_at);

-- 3. Organization Departments Table
create table if not exists public.organization_departments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    code text,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_org_departments_org on public.organization_departments(organization_id);

-- 4. Organization Membership Requests (Faculty Join Requests)
create table if not exists public.organization_membership_requests (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    department_id uuid references public.organization_departments(id) on delete set null,
    role system_role not null default 'TEACHER',
    status text not null default 'PENDING' check (status in ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REMOVED')),
    institutional_id text,
    work_email text not null,
    notes text,
    submitted_at timestamptz not null default now(),
    reviewed_by uuid references public.profiles(id) on delete set null,
    reviewed_at timestamptz,
    updated_at timestamptz not null default now()
);

create index if not exists idx_org_membership_requests_org on public.organization_membership_requests(organization_id);
create index if not exists idx_org_membership_requests_user on public.organization_membership_requests(user_id);
create index if not exists idx_org_membership_requests_status on public.organization_membership_requests(status);
create index if not exists idx_org_membership_requests_created on public.organization_membership_requests(submitted_at);

-- 5. Extend organization_members with department_id
alter table public.organization_members 
    add column if not exists department_id uuid references public.organization_departments(id) on delete set null;

create index if not exists idx_org_members_dept on public.organization_members(department_id);

-- 6. Extend Day 8 teacher resources with organization_id support
alter table public.teacher_subjects 
    add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_teacher_subjects_org on public.teacher_subjects(organization_id);

alter table public.teacher_assessments 
    add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_teacher_assessments_org on public.teacher_assessments(organization_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.organization_verifications enable row level security;
alter table public.organization_departments enable row level security;
alter table public.organization_membership_requests enable row level security;

-- 1. organization_verifications policies
-- Platform admins can view and manage all verification requests
create policy "org_verifications_platform_admin"
    on public.organization_verifications for all
    using (public.is_platform_admin(auth.uid()))
    with check (public.is_platform_admin(auth.uid()));

-- Organization creators can view their own organization verification requests
create policy "org_verifications_creator_select"
    on public.organization_verifications for select
    using (
        submitted_by = auth.uid() or
        exists (
            select 1 from public.organizations o
            where o.id = organization_verifications.organization_id and o.created_by = auth.uid()
        )
    );

-- Organization creators can submit verification requests
create policy "org_verifications_creator_insert"
    on public.organization_verifications for insert
    with check (
        submitted_by = auth.uid() and
        exists (
            select 1 from public.organizations o
            where o.id = organization_verifications.organization_id and o.created_by = auth.uid()
        )
    );

-- 2. organization_departments policies
-- Org members and platform admins can view departments
create policy "org_departments_select"
    on public.organization_departments for select
    using (
        public.is_org_member(organization_id, auth.uid()) or
        public.is_platform_admin(auth.uid()) or
        exists (
            select 1 from public.organizations o
            where o.id = organization_departments.organization_id and o.created_by = auth.uid()
        )
    );

-- College Admins can manage departments in their organization
create policy "org_departments_admin_manage"
    on public.organization_departments for all
    using (
        exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_departments.organization_id
              and om.user_id = auth.uid()
              and om.role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN')
        ) or
        exists (
            select 1 from public.organizations o
            where o.id = organization_departments.organization_id and o.created_by = auth.uid()
        ) or
        public.is_platform_admin(auth.uid())
    )
    with check (
        exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_departments.organization_id
              and om.user_id = auth.uid()
              and om.role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN')
        ) or
        exists (
            select 1 from public.organizations o
            where o.id = organization_departments.organization_id and o.created_by = auth.uid()
        ) or
        public.is_platform_admin(auth.uid())
    );

-- 3. organization_membership_requests policies
-- Users can view their own requests
create policy "org_membership_requests_user_select"
    on public.organization_membership_requests for select
    using (
        user_id = auth.uid() or
        public.is_platform_admin(auth.uid()) or
        exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_membership_requests.organization_id
              and om.user_id = auth.uid()
              and om.role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN')
        )
    );

-- Users can submit their own join requests
create policy "org_membership_requests_user_insert"
    on public.organization_membership_requests for insert
    with check (user_id = auth.uid());

-- College admins can update (approve/reject) requests for their organization
create policy "org_membership_requests_admin_update"
    on public.organization_membership_requests for update
    using (
        exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_membership_requests.organization_id
              and om.user_id = auth.uid()
              and om.role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN')
        ) or
        public.is_platform_admin(auth.uid())
    )
    with check (
        exists (
            select 1 from public.organization_members om
            where om.organization_id = organization_membership_requests.organization_id
              and om.user_id = auth.uid()
              and om.role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN')
        ) or
        public.is_platform_admin(auth.uid())
    );

-- 4. Allow authenticated users to search/discover VERIFIED organizations
create policy "organizations_verified_discovery"
    on public.organizations for select
    using (
        verification_status = 'VERIFIED' or
        verified = true or
        public.is_org_member(id, auth.uid()) or
        created_by = auth.uid() or
        public.is_platform_admin(auth.uid())
    );
