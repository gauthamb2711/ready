-- ==============================================================================
-- READY Platform - Day 6 Database Migration
-- Retention Engine + Spaced Retrieval (24H, 7D, 30D)
-- ==============================================================================

-- 1. Retention Checks Table
create table if not exists public.retention_checks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    topic_id uuid references public.curriculum_topics(id) on delete cascade,
    learning_objective_id uuid references public.learning_objectives(id) on delete set null,
    learning_item_id uuid references public.learning_plan_items(id) on delete cascade,
    learning_gain_record_id uuid references public.learning_gain_records(id) on delete set null,
    retention_stage text not null check (retention_stage in ('RETENTION_24H', 'RETENTION_7D', 'RETENTION_30D')),
    scheduled_at timestamptz not null,
    available_at timestamptz not null,
    started_at timestamptz,
    completed_at timestamptz,
    status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'EXPIRED')),
    score numeric,
    question_count integer not null default 0,
    correct_count integer not null default 0,
    retention_percentage numeric,
    baseline_score numeric not null default 0,
    performance_delta numeric,
    retention_status text check (retention_status in ('RETAINED', 'STABLE', 'DECLINING', 'NEEDS_REVIEW', 'INSUFFICIENT_EVIDENCE')),
    revision_item_id uuid references public.learning_plan_items(id) on delete set null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, learning_item_id, retention_stage)
);

create index if not exists idx_retention_checks_user on public.retention_checks(user_id);
create index if not exists idx_retention_checks_item on public.retention_checks(learning_item_id);
create index if not exists idx_retention_checks_topic on public.retention_checks(topic_id);
create index if not exists idx_retention_checks_scheduled on public.retention_checks(scheduled_at);
create index if not exists idx_retention_checks_status on public.retention_checks(status);

-- 2. Retention Responses Table (Active Retrieval Answers)
create table if not exists public.retention_responses (
    id uuid primary key default gen_random_uuid(),
    retention_check_id uuid not null references public.retention_checks(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    question_id text not null,
    question_prompt text not null,
    student_answer text,
    correct_answer text,
    is_correct boolean not null default false,
    marks integer not null default 1,
    time_spent_seconds integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_retention_responses_check on public.retention_responses(retention_check_id);
create index if not exists idx_retention_responses_user on public.retention_responses(user_id);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict student ownership: auth.uid() = user_id
-- No default grants to teachers, companies, colleges, or other students.
-- ==============================================================================

alter table public.retention_checks enable row level security;
alter table public.retention_responses enable row level security;

-- Policies for retention_checks
create policy "Users can manage own retention checks"
    on public.retention_checks for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for retention_responses
create policy "Users can manage own retention responses"
    on public.retention_responses for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
