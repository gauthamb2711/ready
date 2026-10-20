-- ==============================================================================
-- READY Platform - Day 7 Database Migration
-- Readiness Score Engine + Mock Exam Engine
-- ==============================================================================

-- 1. Readiness Assessments Table
create table if not exists public.readiness_assessments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    score numeric not null default 0,
    status text not null check (status in ('NOT_READY', 'NEEDS_WORK', 'DEVELOPING', 'READY', 'HIGHLY_READY')),
    calculated_at timestamptz not null default now(),
    evidence_version text not null default 'v1.0',
    exam_date date,
    days_remaining integer,
    current_capability numeric not null default 0,
    target_capability numeric not null default 85,
    capability_gap numeric not null default 85,
    summary jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_readiness_assessments_user on public.readiness_assessments(user_id);
create index if not exists idx_readiness_assessments_subject on public.readiness_assessments(subject_id);
create index if not exists idx_readiness_assessments_calc on public.readiness_assessments(calculated_at desc);

-- 2. Readiness Components Table (Mastery, Learning Gain, Retention, Coverage, Mock, Time)
create table if not exists public.readiness_components (
    id uuid primary key default gen_random_uuid(),
    readiness_assessment_id uuid not null references public.readiness_assessments(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    component_type text not null check (component_type in ('MASTERY', 'LEARNING_GAIN', 'RETENTION', 'COVERAGE', 'MOCK_PERFORMANCE', 'TIME_READINESS')),
    score numeric,
    weight numeric not null,
    effective_weight numeric not null,
    evidence_status text not null check (evidence_status in ('SUFFICIENT', 'LIMITED', 'INSUFFICIENT')),
    explanation text not null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_readiness_components_assessment on public.readiness_components(readiness_assessment_id);
create index if not exists idx_readiness_components_user on public.readiness_components(user_id);
create index if not exists idx_readiness_components_type on public.readiness_components(component_type);

-- 3. Mock Exams Table
create table if not exists public.mock_exams (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    title text not null,
    total_questions integer not null default 0,
    total_marks integer not null default 0,
    duration_seconds integer not null default 1800,
    difficulty text not null default 'MIXED' check (difficulty in ('EASY', 'MEDIUM', 'HARD', 'MIXED')),
    status text not null default 'READY' check (status in ('DRAFT', 'READY', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'CANCELLED')),
    started_at timestamptz,
    submitted_at timestamptz,
    config jsonb default '{}'::jsonb,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_mock_exams_user on public.mock_exams(user_id);
create index if not exists idx_mock_exams_subject on public.mock_exams(subject_id);
create index if not exists idx_mock_exams_status on public.mock_exams(status);

-- 4. Mock Exam Questions Table
create table if not exists public.mock_exam_questions (
    id uuid primary key default gen_random_uuid(),
    mock_exam_id uuid not null references public.mock_exams(id) on delete cascade,
    question_id text not null,
    topic_id uuid references public.curriculum_topics(id) on delete set null,
    topic_title text not null,
    prompt text not null,
    options jsonb default '[]'::jsonb,
    correct_answer text not null, -- Server-side evaluation only
    explanation text,
    question_type text not null default 'MCQ',
    difficulty text not null default 'MEDIUM',
    display_order integer not null default 1,
    marks integer not null default 1,
    created_at timestamptz not null default now()
);

create index if not exists idx_mock_exam_questions_exam on public.mock_exam_questions(mock_exam_id);
create index if not exists idx_mock_exam_questions_order on public.mock_exam_questions(mock_exam_id, display_order);

-- 5. Mock Exam Attempts Table
create table if not exists public.mock_exam_attempts (
    id uuid primary key default gen_random_uuid(),
    mock_exam_id uuid not null references public.mock_exams(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    started_at timestamptz not null default now(),
    submitted_at timestamptz,
    score numeric not null default 0,
    percentage numeric not null default 0,
    correct_count integer not null default 0,
    incorrect_count integer not null default 0,
    unanswered_count integer not null default 0,
    time_used_seconds integer not null default 0,
    status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'CANCELLED')),
    topic_performance jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_mock_exam_attempts_exam on public.mock_exam_attempts(mock_exam_id);
create index if not exists idx_mock_exam_attempts_user on public.mock_exam_attempts(user_id);
create index if not exists idx_mock_exam_attempts_status on public.mock_exam_attempts(status);

-- 6. Mock Exam Responses Table (Idempotent answer saves)
create table if not exists public.mock_exam_responses (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.mock_exam_attempts(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    question_id text not null,
    selected_answer text,
    awarded_marks numeric not null default 0,
    is_correct boolean not null default false,
    answered_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(attempt_id, question_id)
);

create index if not exists idx_mock_exam_responses_attempt on public.mock_exam_responses(attempt_id);
create index if not exists idx_mock_exam_responses_user on public.mock_exam_responses(user_id);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict student-private isolation: auth.uid() = user_id
-- Never expose to teachers, companies, colleges, or other students.
-- ==============================================================================

alter table public.readiness_assessments enable row level security;
alter table public.readiness_components enable row level security;
alter table public.mock_exams enable row level security;
alter table public.mock_exam_questions enable row level security;
alter table public.mock_exam_attempts enable row level security;
alter table public.mock_exam_responses enable row level security;

-- Policies for readiness_assessments
create policy "Users can manage own readiness assessments"
    on public.readiness_assessments for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for readiness_components
create policy "Users can manage own readiness components"
    on public.readiness_components for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for mock_exams
create policy "Users can manage own mock exams"
    on public.mock_exams for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for mock_exam_questions (via parent mock_exam ownership)
create policy "Users can view mock questions of own mock exams"
    on public.mock_exam_questions for all
    using (
        exists (
            select 1 from public.mock_exams
            where public.mock_exams.id = mock_exam_questions.mock_exam_id
            and public.mock_exams.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.mock_exams
            where public.mock_exams.id = mock_exam_questions.mock_exam_id
            and public.mock_exams.user_id = auth.uid()
        )
    );

-- Policies for mock_exam_attempts
create policy "Users can manage own mock exam attempts"
    on public.mock_exam_attempts for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for mock_exam_responses
create policy "Users can manage own mock exam responses"
    on public.mock_exam_responses for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
