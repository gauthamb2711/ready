-- ==============================================================================
-- READY Platform - Day 3 Student Intelligence Foundation Migration
-- ==============================================================================

-- 1. Student Subjects Table
create table if not exists public.student_subjects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    code text,
    description text,
    exam_date date,
    target_score text not null default '85',
    available_daily_study_time text not null default '60_MIN',
    current_prep_level text not null default 'NOT_STARTED',
    current_capability_score numeric not null default 0,
    target_capability_score numeric not null default 85,
    capability_gap numeric not null default 85,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_student_subjects_user on public.student_subjects(user_id);

-- 2. Curriculum Units Table
create table if not exists public.student_units (
    id uuid primary key default gen_random_uuid(),
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    sequence integer not null default 1,
    created_at timestamptz not null default now()
);

create index if not exists idx_student_units_subject on public.student_units(subject_id);
create index if not exists idx_student_units_user on public.student_units(user_id);

-- 3. Curriculum Topics Table
create table if not exists public.curriculum_topics (
    id uuid primary key default gen_random_uuid(),
    unit_id uuid not null references public.student_units(id) on delete cascade,
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    sequence integer not null default 1,
    importance text not null default 'CORE',
    created_at timestamptz not null default now()
);

create index if not exists idx_curriculum_topics_unit on public.curriculum_topics(unit_id);
create index if not exists idx_curriculum_topics_subject on public.curriculum_topics(subject_id);
create index if not exists idx_curriculum_topics_user on public.curriculum_topics(user_id);

-- 4. Curriculum Subtopics Table
create table if not exists public.curriculum_subtopics (
    id uuid primary key default gen_random_uuid(),
    topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    sequence integer not null default 1,
    created_at timestamptz not null default now()
);

create index if not exists idx_curriculum_subtopics_topic on public.curriculum_subtopics(topic_id);
create index if not exists idx_curriculum_subtopics_user on public.curriculum_subtopics(user_id);

-- 5. Learning Objectives Table
create table if not exists public.learning_objectives (
    id uuid primary key default gen_random_uuid(),
    subtopic_id uuid not null references public.curriculum_subtopics(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    description text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_learning_objectives_subtopic on public.learning_objectives(subtopic_id);
create index if not exists idx_learning_objectives_user on public.learning_objectives(user_id);

-- 6. Diagnostic Assessments Table
create table if not exists public.diagnostic_assessments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    title text not null,
    status text not null default 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED
    intake_data jsonb default '{}'::jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    total_questions integer default 0,
    correct_count integer default 0,
    score_percentage numeric default 0,
    current_capability_score numeric default 0,
    target_capability_score numeric default 85,
    capability_gap numeric default 85,
    summary jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_diagnostic_assessments_user on public.diagnostic_assessments(user_id);
create index if not exists idx_diagnostic_assessments_subject on public.diagnostic_assessments(subject_id);

-- 7. Diagnostic Questions Table
create table if not exists public.diagnostic_questions (
    id uuid primary key default gen_random_uuid(),
    subject_id uuid references public.student_subjects(id) on delete cascade,
    unit_id uuid references public.student_units(id) on delete set null,
    topic_id uuid references public.curriculum_topics(id) on delete set null,
    subtopic_id uuid references public.curriculum_subtopics(id) on delete set null,
    learning_objective_id uuid references public.learning_objectives(id) on delete set null,
    type text not null default 'MCQ', -- MCQ, SHORT_ANSWER, PROBLEM_SOLVING, APPLICATION, REASONING, DEBUGGING
    difficulty text not null default 'MEDIUM', -- EASY, MEDIUM, HARD
    prompt text not null,
    options jsonb default '[]'::jsonb,
    correct_answer text not null,
    explanation text,
    marks integer not null default 1,
    created_at timestamptz not null default now()
);

create index if not exists idx_diagnostic_questions_subject on public.diagnostic_questions(subject_id);
create index if not exists idx_diagnostic_questions_topic on public.diagnostic_questions(topic_id);

-- 8. Diagnostic Responses Table
create table if not exists public.diagnostic_responses (
    id uuid primary key default gen_random_uuid(),
    diagnostic_id uuid not null references public.diagnostic_assessments(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    question_id uuid not null references public.diagnostic_questions(id) on delete cascade,
    student_answer text,
    is_correct boolean,
    score numeric default 0,
    time_spent_seconds integer default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_diagnostic_responses_diag on public.diagnostic_responses(diagnostic_id);
create index if not exists idx_diagnostic_responses_user on public.diagnostic_responses(user_id);

-- 9. Topic Capability States Table
create table if not exists public.topic_capability_states (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    subject_id uuid not null references public.student_subjects(id) on delete cascade,
    topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
    classification text not null default 'NOT_TESTED',
    -- STRONG, KNOWN, UNKNOWN, FORGOTTEN, MISUNDERSTOOD, FALSE_CONFIDENCE, NOT_TESTED
    current_capability_score numeric not null default 0,
    target_capability_score numeric not null default 85,
    capability_gap numeric not null default 85,
    confidence_reported text,
    diagnostic_score numeric not null default 0,
    evidence_count integer not null default 0,
    updated_at timestamptz not null default now(),
    unique(user_id, topic_id)
);

create index if not exists idx_topic_capability_user on public.topic_capability_states(user_id);
create index if not exists idx_topic_capability_subject on public.topic_capability_states(subject_id);
create index if not exists idx_topic_capability_topic on public.topic_capability_states(topic_id);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) - STRICT STUDENT PRIVACY
-- ==============================================================================
alter table public.student_subjects enable row level security;
alter table public.student_units enable row level security;
alter table public.curriculum_topics enable row level security;
alter table public.curriculum_subtopics enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.diagnostic_assessments enable row level security;
alter table public.diagnostic_questions enable row level security;
alter table public.diagnostic_responses enable row level security;
alter table public.topic_capability_states enable row level security;

-- Student Subjects Policies
create policy "Student can view own subjects"
    on public.student_subjects for select
    using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

create policy "Student can insert own subjects"
    on public.student_subjects for insert
    with check (auth.uid() = user_id);

create policy "Student can update own subjects"
    on public.student_subjects for update
    using (auth.uid() = user_id);

create policy "Student can delete own subjects"
    on public.student_subjects for delete
    using (auth.uid() = user_id);

-- Curriculum Units Policies
create policy "Student can manage own units"
    on public.student_units for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Curriculum Topics Policies
create policy "Student can manage own topics"
    on public.curriculum_topics for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Curriculum Subtopics Policies
create policy "Student can manage own subtopics"
    on public.curriculum_subtopics for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Learning Objectives Policies
create policy "Student can manage own learning objectives"
    on public.learning_objectives for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Diagnostic Assessments Policies
create policy "Student can manage own diagnostic assessments"
    on public.diagnostic_assessments for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Diagnostic Questions Policies
-- Note: Questions are viewable by authenticated students of the subject or globally
create policy "Diagnostic questions readable by authenticated users"
    on public.diagnostic_questions for select
    using (auth.uid() is not null);

create policy "Diagnostic questions manageable by creator"
    on public.diagnostic_questions for all
    using (auth.uid() is not null)
    with check (auth.uid() is not null);

-- Diagnostic Responses Policies
create policy "Student can view and manage own responses"
    on public.diagnostic_responses for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Topic Capability States Policies
create policy "Student can view and manage own capability states"
    on public.topic_capability_states for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
