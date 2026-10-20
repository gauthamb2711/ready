-- ==============================================================================
-- READY Platform - Day 9 Teacher Question Bank & Question Authoring System
-- ==============================================================================
-- 1. Extends public.teacher_questions for complete Day 9 lifecycle & metadata:
--    - Adds 'QUALITY_CHECK' to status enum/check constraint
--    - Relaxes NOT NULL on topic_id and correct_answer for partial DRAFT saving
--    - Adds subtopic, subtopic_id, tags, estimated_time, rejection_reason,
--      reviewed_by, reviewed_at, review_notes
-- 2. Organization-aware multi-tenant RLS policies on teacher_questions:
--    - Author access (independent and institutional)
--    - Active organization member/reviewer visibility
--    - Strict isolation between College A and College B
--    - Student denial of teacher answer keys
-- 3. Subject organization affiliation support
-- ==============================================================================

-- 1. Extend teacher_subjects with optional organization_id
alter table public.teacher_subjects
    add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_teacher_subjects_org on public.teacher_subjects(organization_id);

-- Update teacher_subjects RLS to allow organization members to view institutional subjects
drop policy if exists "teacher_subjects_owner_select" on public.teacher_subjects;
create policy "teacher_subjects_select"
    on public.teacher_subjects for select
    using (
        auth.uid() = owner_id
        or (
            organization_id is not null and exists (
                select 1 from public.organization_members om
                where om.organization_id = teacher_subjects.organization_id
                  and om.user_id = auth.uid()
                  and om.status = 'ACTIVE'
            )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    );

-- Allow authors to insert their own subjects; if organization_id is set, must be an active member of that org
drop policy if exists "teacher_subjects_owner_insert" on public.teacher_subjects;
create policy "teacher_subjects_insert"
    on public.teacher_subjects for insert
    with check (
        auth.uid() = owner_id
        and (
            organization_id is null
            or exists (
                select 1 from public.organization_members om
                where om.organization_id = teacher_subjects.organization_id
                  and om.user_id = auth.uid()
                  and om.status = 'ACTIVE'
            )
        )
    );

-- Allow authors to update their subjects, or authorized organization reviewers/admins
drop policy if exists "teacher_subjects_owner_update" on public.teacher_subjects;
create policy "teacher_subjects_update"
    on public.teacher_subjects for update
    using (
        auth.uid() = owner_id
        or (
            organization_id is not null and (
                public.is_org_admin(teacher_subjects.organization_id, auth.uid())
                or exists (
                    select 1 from public.organization_members om
                    where om.organization_id = teacher_subjects.organization_id
                      and om.user_id = auth.uid()
                      and om.status = 'ACTIVE'
                      and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
                )
            )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    );

-- 2. Extend teacher_questions schema
-- Drop existing status check constraint and update to include QUALITY_CHECK
alter table public.teacher_questions
    drop constraint if exists teacher_questions_status_check;

alter table public.teacher_questions
    add constraint teacher_questions_status_check
    check (status in ('DRAFT', 'QUALITY_CHECK', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'));

-- Drop NOT NULL from topic_id and correct_answer to support incomplete DRAFT saving
alter table public.teacher_questions
    alter column topic_id drop not null;

alter table public.teacher_questions
    alter column correct_answer drop not null;

-- Add Day 9 metadata columns
alter table public.teacher_questions
    add column if not exists subtopic text,
    add column if not exists subtopic_id uuid references public.teacher_curriculum_subtopics(id) on delete set null,
    add column if not exists tags text[] not null default '{}'::text[],
    add column if not exists estimated_time integer not null default 60 check (estimated_time > 0),
    add column if not exists rejection_reason text,
    add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
    add column if not exists reviewed_at timestamptz,
    add column if not exists review_notes text;

-- Add indexes for search, filtering, and organization queries
create index if not exists idx_teacher_questions_org on public.teacher_questions(organization_id);
create index if not exists idx_teacher_questions_quality on public.teacher_questions(quality_status);
create index if not exists idx_teacher_questions_type on public.teacher_questions(question_type);
create index if not exists idx_teacher_questions_diff on public.teacher_questions(difficulty);
create index if not exists idx_teacher_questions_cog on public.teacher_questions(cognitive_level);
create index if not exists idx_teacher_questions_tags on public.teacher_questions using gin(tags);

-- 3. Upgrade RLS on teacher_questions for Organization-Aware Isolation
drop policy if exists "teacher_questions_owner_select" on public.teacher_questions;
drop policy if exists "teacher_questions_owner_insert" on public.teacher_questions;
drop policy if exists "teacher_questions_owner_update" on public.teacher_questions;
drop policy if exists "teacher_questions_owner_delete" on public.teacher_questions;
drop policy if exists "teacher_questions_select" on public.teacher_questions;
drop policy if exists "teacher_questions_insert" on public.teacher_questions;
drop policy if exists "teacher_questions_update" on public.teacher_questions;
drop policy if exists "teacher_questions_delete" on public.teacher_questions;

-- SELECT Policy:
-- - Question author can always see their questions
-- - Institutional questions (organization_id is not null) can be seen by active members of that exact organization
-- - College A members can NEVER see College B questions
-- - Platform Admin can inspect for platform compliance
-- - Students have NO access
create policy "teacher_questions_select"
    on public.teacher_questions for select
    using (
        auth.uid() = owner_id
        or (
            organization_id is not null and exists (
                select 1 from public.organization_members om
                where om.organization_id = teacher_questions.organization_id
                  and om.user_id = auth.uid()
                  and om.status = 'ACTIVE'
            )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    );

-- INSERT Policy:
-- Author must match auth.uid(), and if institutional, must be active member of that org
create policy "teacher_questions_insert"
    on public.teacher_questions for insert
    with check (
        auth.uid() = owner_id
        and (
            organization_id is null
            or exists (
                select 1 from public.organization_members om
                where om.organization_id = teacher_questions.organization_id
                  and om.user_id = auth.uid()
                  and om.status = 'ACTIVE'
            )
        )
    );

-- UPDATE Policy:
-- - Author can update while in editable states (DRAFT, QUALITY_CHECK, REJECTED)
-- - Organization reviewers / College Admins can update status and review fields
-- - Platform Admin can intervene
create policy "teacher_questions_update"
    on public.teacher_questions for update
    using (
        (auth.uid() = owner_id and status in ('DRAFT', 'QUALITY_CHECK', 'REJECTED'))
        or (
            organization_id is not null and (
                public.is_org_admin(teacher_questions.organization_id, auth.uid())
                or exists (
                    select 1 from public.organization_members om
                    where om.organization_id = teacher_questions.organization_id
                      and om.user_id = auth.uid()
                      and om.status = 'ACTIVE'
                      and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
                )
            )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    )
    with check (
        auth.uid() = owner_id
        or (
            organization_id is not null and (
                public.is_org_admin(teacher_questions.organization_id, auth.uid())
                or exists (
                    select 1 from public.organization_members om
                    where om.organization_id = teacher_questions.organization_id
                      and om.user_id = auth.uid()
                      and om.status = 'ACTIVE'
                      and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
                )
            )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    );

-- DELETE Policy:
-- Authors can delete their own DRAFT/REJECTED questions. Approved questions cannot be deleted (only ARCHIVED).
create policy "teacher_questions_delete"
    on public.teacher_questions for delete
    using (
        (auth.uid() = owner_id and status in ('DRAFT', 'REJECTED'))
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    );

-- 4. Audit Log Helper for Question Bank Events
-- Ensures all question bank lifecycle events are recorded cleanly in public.audit_logs
create or replace function public.log_question_lifecycle_event(
    p_actor_id uuid,
    p_action text,
    p_question_id uuid,
    p_organization_id uuid,
    p_details jsonb default '{}'::jsonb
)
returns uuid as $$
declare
    v_log_id uuid;
begin
    insert into public.audit_logs (
        actor_id,
        organization_id,
        action,
        entity_type,
        entity_id,
        details,
        created_at
    ) values (
        p_actor_id,
        p_organization_id,
        p_action,
        'QUESTION',
        p_question_id,
        p_details,
        now()
    ) returning id into v_log_id;

    return v_log_id;
exception
    when others then
        -- Fail open so application operations are not blocked by audit logging glitches
        return null;
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Audit Log Row-Level Security Policies
drop policy if exists "audit_logs_actor_insert" on public.audit_logs;
create policy "audit_logs_actor_insert"
    on public.audit_logs for insert
    with check (auth.uid() = actor_id);

drop policy if exists "audit_logs_actor_select" on public.audit_logs;
create policy "audit_logs_actor_select"
    on public.audit_logs for select
    using (
        auth.uid() = actor_id
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    );
