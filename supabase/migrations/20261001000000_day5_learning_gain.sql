-- ==============================================================================
-- READY Platform - Day 5 Database Migration
-- Learning Action Workspace + Learning Gain Verification Engine
-- ==============================================================================

-- 1. Learning Action Sessions Table
create table if not exists public.learning_action_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    plan_item_id uuid not null references public.learning_plan_items(id) on delete cascade,
    action_type text not null,
    current_stage text not null default 'PRE_VERIFICATION',
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    actual_minutes_spent integer not null default 0,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, plan_item_id)
);

create index if not exists idx_action_sessions_user on public.learning_action_sessions(user_id);
create index if not exists idx_action_sessions_item on public.learning_action_sessions(plan_item_id);

-- 2. Learning Verification Assessments Table (Pre-learning and Post-learning)
create table if not exists public.learning_verification_assessments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    plan_item_id uuid not null references public.learning_plan_items(id) on delete cascade,
    topic_id uuid references public.curriculum_topics(id) on delete cascade,
    learning_objective_id uuid references public.learning_objectives(id) on delete set null,
    type text not null check (type in ('PRE_LEARNING', 'POST_LEARNING')),
    total_questions integer not null default 0,
    correct_count integer not null default 0,
    score_percentage numeric not null default 0,
    completed_at timestamptz not null default now(),
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    unique(user_id, plan_item_id, type)
);

create index if not exists idx_verif_assess_user on public.learning_verification_assessments(user_id);
create index if not exists idx_verif_assess_item on public.learning_verification_assessments(plan_item_id);

-- 3. Learning Verification Responses Table
create table if not exists public.learning_verification_responses (
    id uuid primary key default gen_random_uuid(),
    assessment_id uuid not null references public.learning_verification_assessments(id) on delete cascade,
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

create index if not exists idx_verif_resp_assessment on public.learning_verification_responses(assessment_id);
create index if not exists idx_verif_resp_user on public.learning_verification_responses(user_id);

-- 4. Learning Gain Records Table
create table if not exists public.learning_gain_records (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    plan_item_id uuid not null references public.learning_plan_items(id) on delete cascade,
    topic_id uuid references public.curriculum_topics(id) on delete cascade,
    learning_objective_id uuid references public.learning_objectives(id) on delete set null,
    pre_score numeric not null,
    post_score numeric not null,
    gain_points numeric not null,
    pre_questions integer not null default 0,
    post_questions integer not null default 0,
    category text not null check (category in ('GAINED', 'IMPROVED', 'STABLE', 'INSUFFICIENT_EVIDENCE')),
    category_reason text not null,
    previous_capability_state text,
    new_capability_state text,
    measurement_method text not null default 'PERCENTAGE_POINT_DELTA',
    measured_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    unique(user_id, plan_item_id)
);

create index if not exists idx_learning_gain_user on public.learning_gain_records(user_id);
create index if not exists idx_learning_gain_item on public.learning_gain_records(plan_item_id);
create index if not exists idx_learning_gain_topic on public.learning_gain_records(topic_id);

-- 5. Student Progress Table
create table if not exists public.student_progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    total_actions_scheduled integer not null default 0,
    total_actions_completed integer not null default 0,
    total_study_minutes_spent integer not null default 0,
    average_learning_gain numeric not null default 0,
    last_activity_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, subject_id)
);

create index if not exists idx_student_progress_user on public.student_progress(user_id);
create index if not exists idx_student_progress_subject on public.student_progress(subject_id);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict student ownership: auth.uid() = user_id
-- No default grants to teachers, companies, or other students.
-- ==============================================================================

alter table public.learning_action_sessions enable row level security;
alter table public.learning_verification_assessments enable row level security;
alter table public.learning_verification_responses enable row level security;
alter table public.learning_gain_records enable row level security;
alter table public.student_progress enable row level security;

-- Policies for learning_action_sessions
create policy "Users can manage own action sessions"
    on public.learning_action_sessions for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for learning_verification_assessments
create policy "Users can manage own verification assessments"
    on public.learning_verification_assessments for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for learning_verification_responses
create policy "Users can manage own verification responses"
    on public.learning_verification_responses for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for learning_gain_records
create policy "Users can manage own learning gain records"
    on public.learning_gain_records for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for student_progress
create policy "Users can manage own progress"
    on public.student_progress for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
