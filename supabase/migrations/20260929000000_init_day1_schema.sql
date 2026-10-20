-- ==============================================================================
-- READY Platform - Day 1 Database Foundation Schema
-- ==============================================================================
-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================
do $$ begin
    if not exists (select 1 from pg_type where typname = 'account_type') then
        create type account_type as enum (
            'STUDENT',
            'CANDIDATE',
            'PROFESSIONAL',
            'TEACHER',
            'COLLEGE_UNIVERSITY',
            'COMPANY'
        );
    end if;
    if not exists (select 1 from pg_type where typname = 'account_state') then
        create type account_state as enum (
            'PENDING',
            'ACTIVE',
            'VERIFIED',
            'REJECTED',
            'SUSPENDED',
            'REVOKED'
        );
    end if;
    if not exists (select 1 from pg_type where typname = 'system_role') then
        create type system_role as enum (
            'STUDENT',
            'CANDIDATE',
            'PROFESSIONAL',
            'TEACHER',
            'INSTRUCTOR',
            'COLLEGE_ADMIN',
            'DEPARTMENT_ADMIN',
            'EXAM_ADMIN',
            'COMPANY_ADMIN',
            'RECRUITER',
            'TRAINING_MANAGER',
            'ASSESSMENT_MANAGER',
            'PLATFORM_ADMIN',
            'SECURITY_ADMIN',
            'SUPPORT_ADMIN'
        );
    end if;
    if not exists (select 1 from pg_type where typname = 'org_type') then
        create type org_type as enum (
            'COLLEGE_UNIVERSITY',
            'COMPANY',
            'TRAINING_INSTITUTE',
            'EXAM_BODY'
        );
    end if;
    if not exists (select 1 from pg_type where typname = 'org_member_status') then
        create type org_member_status as enum (
            'INVITED',
            'ACTIVE',
            'SUSPENDED',
            'REMOVED'
        );
    end if;
end $$;

-- ==============================================================================
-- 2. USERS & PROFILES
-- ==============================================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    first_name text,
    last_name text,
    display_name text,
    account_type account_type not null default 'STUDENT',
    account_state account_state not null default 'ACTIVE',
    country_code text default 'US',
    locale text default 'en-US',
    timezone text default 'UTC',
    avatar_url text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_account_type on public.profiles(account_type);
create index if not exists idx_profiles_account_state on public.profiles(account_state);

-- ==============================================================================
-- 3. ORGANIZATIONS & TENANCY
-- ==============================================================================
create table if not exists public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    type org_type not null default 'COLLEGE_UNIVERSITY',
    verified boolean not null default false,
    country_code text default 'US',
    timezone text default 'UTC',
    settings jsonb default '{}'::jsonb,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_slug on public.organizations(slug);
create index if not exists idx_organizations_type on public.organizations(type);

-- Organization Memberships
create table if not exists public.organization_members (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role system_role not null default 'STUDENT',
    status org_member_status not null default 'ACTIVE',
    joined_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(organization_id, user_id)
);

create index if not exists idx_org_members_org on public.organization_members(organization_id);
create index if not exists idx_org_members_user on public.organization_members(user_id);

-- ==============================================================================
-- 4. RBAC: ROLES & PERMISSIONS
-- ==============================================================================
create table if not exists public.permissions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text,
    category text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
    role system_role not null,
    permission_code text not null references public.permissions(code) on delete cascade,
    primary key (role, permission_code)
);

create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    role system_role not null,
    organization_id uuid references public.organizations(id) on delete cascade,
    assigned_at timestamptz not null default now(),
    assigned_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists idx_user_roles_unique_global 
    on public.user_roles(user_id, role) 
    where organization_id is null;

create unique index if not exists idx_user_roles_unique_org 
    on public.user_roles(user_id, role, organization_id) 
    where organization_id is not null;

create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_user_roles_org on public.user_roles(organization_id);

-- ==============================================================================
-- 5. ACADEMIC & CURRICULUM FOUNDATION
-- ==============================================================================
create table if not exists public.subjects (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    code text not null,
    name text not null,
    description text,
    is_global boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.programs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    title text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.courses (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    program_id uuid references public.programs(id) on delete set null,
    subject_id uuid references public.subjects(id) on delete set null,
    title text not null,
    code text,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.curriculum (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses(id) on delete cascade,
    version integer not null default 1,
    title text not null,
    structure jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.topics (
    id uuid primary key default gen_random_uuid(),
    course_id uuid references public.courses(id) on delete cascade,
    title text not null,
    sequence integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.subtopics (
    id uuid primary key default gen_random_uuid(),
    topic_id uuid not null references public.topics(id) on delete cascade,
    title text not null,
    sequence integer not null default 0,
    created_at timestamptz not null default now()
);

-- ==============================================================================
-- 6. QUESTIONS & QUESTION BANKS
-- ==============================================================================
create table if not exists public.question_banks (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.questions (
    id uuid primary key default gen_random_uuid(),
    bank_id uuid references public.question_banks(id) on delete set null,
    topic_id uuid references public.topics(id) on delete set null,
    prompt text not null,
    type text not null default 'MULTIPLE_CHOICE',
    options jsonb default '[]'::jsonb,
    rubric jsonb default '{}'::jsonb,
    difficulty integer default 1,
    created_at timestamptz not null default now()
);

-- ==============================================================================
-- 7. ASSESSMENTS, ATTEMPTS, RESPONSES, RESULTS
-- ==============================================================================
create table if not exists public.assessments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    title text not null,
    description text,
    duration_minutes integer,
    status text not null default 'DRAFT',
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.assessment_attempts (
    id uuid primary key default gen_random_uuid(),
    assessment_id uuid not null references public.assessments(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'IN_PROGRESS',
    started_at timestamptz not null default now(),
    completed_at timestamptz
);

create table if not exists public.responses (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
    question_id uuid not null references public.questions(id) on delete cascade,
    user_answer jsonb not null,
    score numeric,
    created_at timestamptz not null default now()
);

create table if not exists public.results (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.assessment_attempts(id) on delete cascade unique,
    total_score numeric not null default 0,
    percentage numeric not null default 0,
    summary jsonb default '{}'::jsonb,
    verified boolean not null default false,
    created_at timestamptz not null default now()
);

-- ==============================================================================
-- 8. LEARNING PLANS & SESSIONS (STUDENT PERSONAL)
-- ==============================================================================
create table if not exists public.learning_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    current_capability text,
    target_capability text,
    gap_summary text,
    status text not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid references public.learning_plans(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    duration_seconds integer default 0,
    summary text,
    created_at timestamptz not null default now()
);

-- ==============================================================================
-- 9. STUDENT PRIVACY: PRIVATE NOTES (PRIVATE BY DEFAULT!)
-- ==============================================================================
create table if not exists public.private_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text,
    content text not null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_private_notes_user on public.private_notes(user_id);

-- ==============================================================================
-- 10. CANDIDATE, SKILLS & CERTIFICATES
-- ==============================================================================
create table if not exists public.candidate_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade unique,
    headline text,
    summary text,
    skills jsonb default '[]'::jsonb,
    is_public boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.skill_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    skill_name text not null,
    current_capability_level integer default 1,
    target_capability_level integer default 1,
    verified boolean not null default false,
    last_verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete set null,
    title text not null,
    certificate_number text not null unique,
    issued_at timestamptz not null default now(),
    verification_url text,
    revoked boolean not null default false
);

-- ==============================================================================
-- 11. AUDIT LOGS, SECURITY EVENTS & NOTIFICATIONS
-- ==============================================================================
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references public.profiles(id) on delete set null,
    organization_id uuid references public.organizations(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    details jsonb default '{}'::jsonb,
    ip_address text,
    created_at timestamptz not null default now()
);

create table if not exists public.security_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    event_type text not null,
    severity text not null default 'INFO',
    details jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    message text not null,
    read boolean not null default false,
    type text not null default 'SYSTEM',
    created_at timestamptz not null default now()
);

-- Future billing readiness foundation
create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    plan_tier text not null default 'FREE',
    status text not null default 'ACTIVE',
    renews_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) - DENY-BY-DEFAULT
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.subjects enable row level security;
alter table public.programs enable row level security;
alter table public.courses enable row level security;
alter table public.curriculum enable row level security;
alter table public.topics enable row level security;
alter table public.subtopics enable row level security;
alter table public.question_banks enable row level security;
alter table public.questions enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.responses enable row level security;
alter table public.results enable row level security;
alter table public.learning_plans enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.private_notes enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.skill_profiles enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_logs enable row level security;
alter table public.security_events enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;

-- ==============================================================================
-- 13. RLS POLICIES
-- ==============================================================================

-- Helper Functions
create or replace function public.is_platform_admin(user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.user_roles
        where user_id = $1 and role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
    );
end;
$$ language plpgsql security definer;

create or replace function public.is_org_member(target_org_id uuid, target_user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.organization_members
        where organization_id = $1 and user_id = $2 and status = 'ACTIVE'
    );
end;
$$ language plpgsql security definer;

-- Profiles Policies
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id or public.is_platform_admin(auth.uid()));

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Organizations Policies
create policy "Org members can view their organization"
    on public.organizations for select
    using (
        public.is_org_member(id, auth.uid()) 
        or created_by = auth.uid()
        or public.is_platform_admin(auth.uid())
    );

create policy "Org creator or admin can update organization"
    on public.organizations for update
    using (
        created_by = auth.uid()
        or exists (
            select 1 from public.organization_members
            where organization_id = id and user_id = auth.uid() 
            and role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN')
        )
        or public.is_platform_admin(auth.uid())
    );

create policy "Authenticated users can create organization"
    on public.organizations for insert
    with check (auth.uid() is not null);

-- Organization Members Policies
create policy "Org members can view peer memberships"
    on public.organization_members for select
    using (
        public.is_org_member(organization_id, auth.uid())
        or user_id = auth.uid()
        or public.is_platform_admin(auth.uid())
    );

create policy "Org admins can manage memberships"
    on public.organization_members for all
    using (
        exists (
            select 1 from public.organization_members m
            where m.organization_id = organization_members.organization_id 
            and m.user_id = auth.uid() 
            and m.role in ('COLLEGE_ADMIN', 'COMPANY_ADMIN')
        )
        or public.is_platform_admin(auth.uid())
    );

-- User Roles Policies
create policy "Users can view own roles"
    on public.user_roles for select
    using (user_id = auth.uid() or public.is_platform_admin(auth.uid()));

-- Permissions Policies (Read-only for authenticated users)
create policy "Permissions are readable by authenticated users"
    on public.permissions for select
    using (auth.uid() is not null);

create policy "Role permissions are readable by authenticated users"
    on public.role_permissions for select
    using (auth.uid() is not null);

-- Student Private Notes Policies (STRICT STUDENT PRIVACY: PRIVATE BY DEFAULT!)
create policy "Private notes strictly isolated to owner"
    on public.private_notes for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Learning Plans Policies (Owner only)
create policy "Learning plans owner access"
    on public.learning_plans for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Learning Sessions Policies (Owner only)
create policy "Learning sessions owner access"
    on public.learning_sessions for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Candidate Profiles Policies (Owner or public if enabled)
create policy "Candidate profile view policy"
    on public.candidate_profiles for select
    using (user_id = auth.uid() or is_public = true or public.is_platform_admin(auth.uid()));

create policy "Candidate profile owner edit policy"
    on public.candidate_profiles for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Skill Profiles Policies
create policy "Skill profiles owner access"
    on public.skill_profiles for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Notifications Policies
create policy "Users can view and manage their own notifications"
    on public.notifications for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Certificates Policies
create policy "Users can view their certificates"
    on public.certificates for select
    using (user_id = auth.uid() or public.is_platform_admin(auth.uid()));

-- Subscriptions Policies
create policy "Users or org members can view their subscriptions"
    on public.subscriptions for select
    using (
        user_id = auth.uid()
        or (organization_id is not null and public.is_org_member(organization_id, auth.uid()))
        or public.is_platform_admin(auth.uid())
    );

-- Assessments Policies
create policy "Assessments accessible to org members or creator"
    on public.assessments for select
    using (
        created_by = auth.uid()
        or (organization_id is not null and public.is_org_member(organization_id, auth.uid()))
        or public.is_platform_admin(auth.uid())
    );

-- Assessment Attempts Policies
create policy "Users can view and manage own attempts"
    on public.assessment_attempts for all
    using (user_id = auth.uid() or public.is_platform_admin(auth.uid()))
    with check (user_id = auth.uid());

-- Results Policies
create policy "Users can view own results"
    on public.results for select
    using (
        exists (
            select 1 from public.assessment_attempts
            where id = results.attempt_id and user_id = auth.uid()
        )
        or public.is_platform_admin(auth.uid())
    );

-- ==============================================================================
-- 14. AUTH HOOK / TRIGGER: AUTOMATIC PROFILE CREATION ON SIGNUP
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_account_type public.account_type;
    v_first_name text;
    v_last_name text;
    v_initial_state public.account_state;
begin
    -- Extract metadata if passed during signup
    v_account_type := coalesce((new.raw_user_meta_data->>'account_type')::public.account_type, 'STUDENT'::public.account_type);
    v_first_name := new.raw_user_meta_data->>'first_name';
    v_last_name := new.raw_user_meta_data->>'last_name';
    
    -- TEACHER, COLLEGE_UNIVERSITY and COMPANY accounts start as PENDING for verification
    if v_account_type in ('TEACHER', 'COLLEGE_UNIVERSITY', 'COMPANY') then
        v_initial_state := 'PENDING';
    else
        v_initial_state := 'ACTIVE';
    end if;

    -- Insert into profiles
    insert into public.profiles (
        id,
        email,
        first_name,
        last_name,
        display_name,
        account_type,
        account_state
    ) values (
        new.id,
        new.email,
        v_first_name,
        v_last_name,
        coalesce(v_first_name || ' ' || v_last_name, split_part(new.email, '@', 1)),
        v_account_type,
        v_initial_state
    );

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
    );

    return new;
end;
$$ language plpgsql security definer;

-- Trigger execution on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
