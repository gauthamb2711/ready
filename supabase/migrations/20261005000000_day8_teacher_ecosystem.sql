-- ==============================================================================
-- READY Platform - Day 8 Teacher Ecosystem Migration
-- ==============================================================================
-- Teacher Ecosystem Foundation:
-- 1. Teacher Subjects
-- 2. Curriculum Hierarchy: Units -> Topics -> Subtopics -> Learning Objectives
-- 3. Question Bank with deterministic statuses & quality reports
-- 4. Assessment Foundation & Question Attachments
-- 5. Strict RLS: Owner-only isolation (auth.uid() = owner_id)
-- ==============================================================================

-- 1. Teacher Subjects Table
create table if not exists public.teacher_subjects (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    code text,
    description text,
    education_level text,
    academic_year text,
    status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_subjects_owner on public.teacher_subjects(owner_id);
create index if not exists idx_teacher_subjects_status on public.teacher_subjects(status);
create index if not exists idx_teacher_subjects_created on public.teacher_subjects(created_at);

-- 2. Teacher Curriculum Units Table
create table if not exists public.teacher_curriculum_units (
    id uuid primary key default gen_random_uuid(),
    subject_id uuid not null references public.teacher_subjects(id) on delete cascade,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    sequence integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_units_subject on public.teacher_curriculum_units(subject_id);
create index if not exists idx_teacher_units_owner on public.teacher_curriculum_units(owner_id);

-- 3. Teacher Curriculum Topics Table
create table if not exists public.teacher_curriculum_topics (
    id uuid primary key default gen_random_uuid(),
    unit_id uuid not null references public.teacher_curriculum_units(id) on delete cascade,
    subject_id uuid not null references public.teacher_subjects(id) on delete cascade,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    sequence integer not null default 1,
    importance text not null default 'MEDIUM' check (importance in ('CORE', 'IMPORTANT', 'SUPPLEMENTARY', 'HIGH', 'MEDIUM', 'LOW')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_topics_unit on public.teacher_curriculum_topics(unit_id);
create index if not exists idx_teacher_topics_subject on public.teacher_curriculum_topics(subject_id);
create index if not exists idx_teacher_topics_owner on public.teacher_curriculum_topics(owner_id);

-- 4. Teacher Curriculum Subtopics Table
create table if not exists public.teacher_curriculum_subtopics (
    id uuid primary key default gen_random_uuid(),
    topic_id uuid not null references public.teacher_curriculum_topics(id) on delete cascade,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    sequence integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_subtopics_topic on public.teacher_curriculum_subtopics(topic_id);
create index if not exists idx_teacher_subtopics_owner on public.teacher_curriculum_subtopics(owner_id);

-- 5. Teacher Learning Objectives Table
create table if not exists public.teacher_learning_objectives (
    id uuid primary key default gen_random_uuid(),
    subtopic_id uuid not null references public.teacher_curriculum_subtopics(id) on delete cascade,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    description text not null,
    sequence integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_objectives_subtopic on public.teacher_learning_objectives(subtopic_id);
create index if not exists idx_teacher_objectives_owner on public.teacher_learning_objectives(owner_id);

-- 6. Teacher Question Bank Table
create table if not exists public.teacher_questions (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete set null,
    subject_id uuid not null references public.teacher_subjects(id) on delete cascade,
    unit_id uuid references public.teacher_curriculum_units(id) on delete set null,
    topic_id uuid not null references public.teacher_curriculum_topics(id) on delete cascade,
    learning_objective_id uuid references public.teacher_learning_objectives(id) on delete set null,
    question_type text not null default 'MCQ' check (question_type in ('MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'SCENARIO', 'PROBLEM_SOLVING')),
    question_text text not null,
    options jsonb default '[]'::jsonb,
    correct_answer text not null,
    explanation text,
    difficulty text not null default 'MEDIUM' check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
    cognitive_level text not null default 'UNDERSTAND' check (cognitive_level in ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE')),
    marks integer not null default 1 check (marks > 0),
    status text not null default 'DRAFT' check (status in ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')),
    quality_status text not null default 'PASS' check (quality_status in ('PASS', 'WARNING', 'FAIL')),
    quality_report jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_questions_owner on public.teacher_questions(owner_id);
create index if not exists idx_teacher_questions_subject on public.teacher_questions(subject_id);
create index if not exists idx_teacher_questions_topic on public.teacher_questions(topic_id);
create index if not exists idx_teacher_questions_status on public.teacher_questions(status);
create index if not exists idx_teacher_questions_created on public.teacher_questions(created_at);

-- 7. Teacher Assessments Foundation Table
create table if not exists public.teacher_assessments (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    subject_id uuid not null references public.teacher_subjects(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_assessments_owner on public.teacher_assessments(owner_id);
create index if not exists idx_teacher_assessments_subject on public.teacher_assessments(subject_id);
create index if not exists idx_teacher_assessments_status on public.teacher_assessments(status);

-- 8. Teacher Assessment Questions Table
create table if not exists public.teacher_assessment_questions (
    id uuid primary key default gen_random_uuid(),
    assessment_id uuid not null references public.teacher_assessments(id) on delete cascade,
    question_id uuid not null references public.teacher_questions(id) on delete cascade,
    display_order integer not null default 1,
    marks integer not null default 1 check (marks > 0),
    created_at timestamptz not null default now(),
    unique (assessment_id, question_id)
);

create index if not exists idx_teacher_aq_assessment on public.teacher_assessment_questions(assessment_id);
create index if not exists idx_teacher_aq_question on public.teacher_assessment_questions(question_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Deny-by-default on all Day 8 tables
alter table public.teacher_subjects enable row level security;
alter table public.teacher_curriculum_units enable row level security;
alter table public.teacher_curriculum_topics enable row level security;
alter table public.teacher_curriculum_subtopics enable row level security;
alter table public.teacher_learning_objectives enable row level security;
alter table public.teacher_questions enable row level security;
alter table public.teacher_assessments enable row level security;
alter table public.teacher_assessment_questions enable row level security;

-- 1. teacher_subjects: Owner-only access
create policy "teacher_subjects_owner_select"
    on public.teacher_subjects for select
    using (auth.uid() = owner_id);

create policy "teacher_subjects_owner_insert"
    on public.teacher_subjects for insert
    with check (auth.uid() = owner_id);

create policy "teacher_subjects_owner_update"
    on public.teacher_subjects for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

create policy "teacher_subjects_owner_delete"
    on public.teacher_subjects for delete
    using (auth.uid() = owner_id);

-- 2. teacher_curriculum_units: Owner-only access
create policy "teacher_units_owner_select"
    on public.teacher_curriculum_units for select
    using (auth.uid() = owner_id);

create policy "teacher_units_owner_insert"
    on public.teacher_curriculum_units for insert
    with check (auth.uid() = owner_id);

create policy "teacher_units_owner_update"
    on public.teacher_curriculum_units for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- 3. teacher_curriculum_topics: Owner-only access
create policy "teacher_topics_owner_select"
    on public.teacher_curriculum_topics for select
    using (auth.uid() = owner_id);

create policy "teacher_topics_owner_insert"
    on public.teacher_curriculum_topics for insert
    with check (auth.uid() = owner_id);

create policy "teacher_topics_owner_update"
    on public.teacher_curriculum_topics for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- 4. teacher_curriculum_subtopics: Owner-only access
create policy "teacher_subtopics_owner_select"
    on public.teacher_curriculum_subtopics for select
    using (auth.uid() = owner_id);

create policy "teacher_subtopics_owner_insert"
    on public.teacher_curriculum_subtopics for insert
    with check (auth.uid() = owner_id);

create policy "teacher_subtopics_owner_update"
    on public.teacher_curriculum_subtopics for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- 5. teacher_learning_objectives: Owner-only access
create policy "teacher_objectives_owner_select"
    on public.teacher_learning_objectives for select
    using (auth.uid() = owner_id);

create policy "teacher_objectives_owner_insert"
    on public.teacher_learning_objectives for insert
    with check (auth.uid() = owner_id);

create policy "teacher_objectives_owner_update"
    on public.teacher_learning_objectives for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- 6. teacher_questions: Owner-only access (Answers NEVER publicly exposed)
create policy "teacher_questions_owner_select"
    on public.teacher_questions for select
    using (auth.uid() = owner_id);

create policy "teacher_questions_owner_insert"
    on public.teacher_questions for insert
    with check (auth.uid() = owner_id);

create policy "teacher_questions_owner_update"
    on public.teacher_questions for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

create policy "teacher_questions_owner_delete"
    on public.teacher_questions for delete
    using (auth.uid() = owner_id);

-- 7. teacher_assessments: Owner-only access
create policy "teacher_assessments_owner_select"
    on public.teacher_assessments for select
    using (auth.uid() = owner_id);

create policy "teacher_assessments_owner_insert"
    on public.teacher_assessments for insert
    with check (auth.uid() = owner_id);

create policy "teacher_assessments_owner_update"
    on public.teacher_assessments for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- 8. teacher_assessment_questions: Owner-only access via assessment ownership
create policy "teacher_aq_owner_select"
    on public.teacher_assessment_questions for select
    using (exists (
        select 1 from public.teacher_assessments a
        where a.id = teacher_assessment_questions.assessment_id
          and a.owner_id = auth.uid()
    ));

create policy "teacher_aq_owner_insert"
    on public.teacher_assessment_questions for insert
    with check (exists (
        select 1 from public.teacher_assessments a
        where a.id = teacher_assessment_questions.assessment_id
          and a.owner_id = auth.uid()
    ));

create policy "teacher_aq_owner_delete"
    on public.teacher_assessment_questions for delete
    using (exists (
        select 1 from public.teacher_assessments a
        where a.id = teacher_assessment_questions.assessment_id
          and a.owner_id = auth.uid()
    ));
