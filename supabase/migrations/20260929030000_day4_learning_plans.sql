-- ==============================================================================
-- READY PLATFORM - DAY 4 DATABASE MIGRATION
-- PERSONALIZED LEARNING PLAN ENGINE & ACTION SCHEDULER
-- ==============================================================================

-- 1. Extend or enhance learning_plans table for subject linkage, modes, versioning
alter table if exists public.learning_plans 
    add column if not exists subject_id uuid references public.student_subjects(id) on delete cascade,
    add column if not exists mode text not null default 'NORMAL_PREP',
    add column if not exists mode_reason text,
    add column if not exists version integer not null default 1,
    add column if not exists is_active boolean not null default true,
    add column if not exists daily_study_minutes integer not null default 60,
    add column if not exists total_estimated_minutes integer not null default 0,
    add column if not exists exam_date date,
    add column if not exists target_score text default '80',
    add column if not exists current_capability_score numeric default 0,
    add column if not exists target_capability_score numeric default 80,
    add column if not exists capability_gap numeric default 80,
    add column if not exists days_remaining integer default 14,
    add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists idx_learning_plans_user on public.learning_plans(user_id);
create index if not exists idx_learning_plans_subject on public.learning_plans(subject_id);
create index if not exists idx_learning_plans_active on public.learning_plans(user_id, subject_id, is_active);

-- 2. Learning Plan Days (Daily schedule groups)
create table if not exists public.learning_plan_days (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references public.learning_plans(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    day_number integer not null,
    scheduled_date date not null,
    week_number integer not null default 1,
    theme text,
    total_allocated_minutes integer not null default 0,
    status text not null default 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_plan_days_plan on public.learning_plan_days(plan_id);
create index if not exists idx_plan_days_user_date on public.learning_plan_days(user_id, scheduled_date);

-- 3. Learning Plan Items (Micro-actions scheduled for each day)
create table if not exists public.learning_plan_items (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references public.learning_plans(id) on delete cascade,
    plan_day_id uuid not null references public.learning_plan_days(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    topic_id text, -- references topic_id / title
    learning_objective_id uuid references public.learning_objectives(id) on delete set null,
    action_type text not null, -- UNDERSTAND, EXPLAIN, EXAMPLE, GUIDED_PRACTICE, INDEPENDENT_PRACTICE, RECALL, APPLICATION, REVIEW
    title text not null,
    description text,
    estimated_minutes integer not null default 20,
    priority text not null default 'MEDIUM', -- CRITICAL, HIGH, MEDIUM, LOW
    reason text not null,
    capability_state text not null default 'NOT_TESTED', -- STRONG, KNOWN, UNKNOWN, FORGOTTEN, MISUNDERSTOOD, FALSE_CONFIDENCE, NOT_TESTED
    sequence integer not null default 1,
    status text not null default 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
    completed_at timestamptz,
    actual_minutes_spent integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_plan_items_plan on public.learning_plan_items(plan_id);
create index if not exists idx_plan_items_day on public.learning_plan_items(plan_day_id);
create index if not exists idx_plan_items_user on public.learning_plan_items(user_id);
create index if not exists idx_plan_items_status on public.learning_plan_items(user_id, status);

-- 4. Enable Row Level Security (RLS) on all new student learning tables
alter table public.learning_plans enable row level security;
alter table public.learning_plan_days enable row level security;
alter table public.learning_plan_items enable row level security;

-- Drop prior policies if exist
drop policy if exists "Student can manage own learning plans" on public.learning_plans;
drop policy if exists "Student can manage own plan days" on public.learning_plan_days;
drop policy if exists "Student can manage own plan items" on public.learning_plan_items;

-- RLS Policies: Private by default!
-- Strictly isolated to the authenticated student (auth.uid() = user_id)
create policy "Student can manage own learning plans"
    on public.learning_plans for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Student can manage own plan days"
    on public.learning_plan_days for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Student can manage own plan items"
    on public.learning_plan_items for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
