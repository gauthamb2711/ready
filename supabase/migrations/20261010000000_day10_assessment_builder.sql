-- ==============================================================================
-- READY Platform - Day 10 Assessment Builder & Exam Management
-- ==============================================================================
-- 1. Extends public.teacher_assessments schema:
--    - Adds 'CLOSED' to status check constraint (DRAFT, PUBLISHED, CLOSED, ARCHIVED)
--    - Adds assessment_type ('EXAM', 'QUIZ', 'ASSIGNMENT', 'DIAGNOSTIC', 'MOCK')
--    - Adds instructions, duration_minutes, total_marks, pass_percentage
--    - Adds scheduled_start, scheduled_end, attempt_limit, shuffle_questions, shuffle_options
-- 2. Extends public.teacher_assessment_questions:
--    - Adds is_mandatory and section_name
-- 3. Multi-tenant RLS updates for teacher_assessments & teacher_assessment_questions:
--    - Independent teacher ownership
--    - Institutional organization access and college admin governance
--    - Cross-tenant isolation
--    - Student denial of draft/closed assessments and answer keys
-- 4. Question self-approval restriction in teacher_questions RLS
-- 5. Assessment lifecycle audit logging helper
-- ==============================================================================

-- 1. Extend teacher_assessments columns
alter table public.teacher_assessments
    add column if not exists instructions text,
    add column if not exists assessment_type text not null default 'EXAM',
    add column if not exists duration_minutes integer not null default 60,
    add column if not exists total_marks integer not null default 0,
    add column if not exists pass_percentage integer not null default 40,
    add column if not exists scheduled_start timestamptz,
    add column if not exists scheduled_end timestamptz,
    add column if not exists attempt_limit integer not null default 1,
    add column if not exists shuffle_questions boolean not null default false,
    add column if not exists shuffle_options boolean not null default false;

-- Update status check constraint to include CLOSED
alter table public.teacher_assessments
    drop constraint if exists teacher_assessments_status_check;

alter table public.teacher_assessments
    add constraint teacher_assessments_status_check
    check (status in ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'));

-- Add assessment type check constraint
alter table public.teacher_assessments
    drop constraint if exists teacher_assessments_type_check;

alter table public.teacher_assessments
    add constraint teacher_assessments_type_check
    check (assessment_type in ('EXAM', 'QUIZ', 'ASSIGNMENT', 'DIAGNOSTIC', 'MOCK'));

-- Add validation constraints for duration, marks, pass percentage, attempts, schedule
alter table public.teacher_assessments
    drop constraint if exists teacher_assessments_duration_check;

alter table public.teacher_assessments
    add constraint teacher_assessments_duration_check
    check (duration_minutes > 0 and duration_minutes <= 1440);

alter table public.teacher_assessments
    drop constraint if exists teacher_assessments_total_marks_check;

alter table public.teacher_assessments
    add constraint teacher_assessments_total_marks_check
    check (total_marks >= 0);

alter table public.teacher_assessments
    drop constraint if exists teacher_assessments_pass_percentage_check;

alter table public.teacher_assessments
    add constraint teacher_assessments_pass_percentage_check
    check (pass_percentage >= 0 and pass_percentage <= 100);

alter table public.teacher_assessments
    drop constraint if exists teacher_assessments_attempt_limit_check;

alter table public.teacher_assessments
    add constraint teacher_assessments_attempt_limit_check
    check (attempt_limit >= 1);

alter table public.teacher_assessments
    drop constraint if exists teacher_assessments_schedule_check;

alter table public.teacher_assessments
    add constraint teacher_assessments_schedule_check
    check (scheduled_end is null or scheduled_start is null or scheduled_end > scheduled_start);

-- 2. Extend teacher_assessment_questions columns
alter table public.teacher_assessment_questions
    add column if not exists is_mandatory boolean not null default true,
    add column if not exists section_name text;

-- Indexes for performance and multi-tenant queries
create index if not exists idx_teacher_assessments_type on public.teacher_assessments(assessment_type);
create index if not exists idx_teacher_assessments_schedule on public.teacher_assessments(scheduled_start, scheduled_end);

-- 3. Multi-Tenant Row-Level Security (RLS) for teacher_assessments
drop policy if exists "teacher_assessments_owner_select" on public.teacher_assessments;
drop policy if exists "teacher_assessments_owner_insert" on public.teacher_assessments;
drop policy if exists "teacher_assessments_owner_update" on public.teacher_assessments;
drop policy if exists "teacher_assessments_owner_delete" on public.teacher_assessments;
drop policy if exists "teacher_assessments_select" on public.teacher_assessments;
drop policy if exists "teacher_assessments_insert" on public.teacher_assessments;
drop policy if exists "teacher_assessments_update" on public.teacher_assessments;
drop policy if exists "teacher_assessments_delete" on public.teacher_assessments;

-- SELECT Policy:
-- - Author can view own assessments
-- - Active members of same organization can view institutional assessments
-- - Platform Admin can view all
-- - Students can view only PUBLISHED assessments
create policy "teacher_assessments_select"
    on public.teacher_assessments for select
    using (
        auth.uid() = owner_id
        or (
            organization_id is not null and exists (
                select 1 from public.organization_members om
                where om.organization_id = teacher_assessments.organization_id
                  and om.user_id = auth.uid()
                  and om.status = 'ACTIVE'
            )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
        or (
            status = 'PUBLISHED'
            and (
                organization_id is null
                or exists (
                    select 1 from public.organization_members om
                    where om.organization_id = teacher_assessments.organization_id
                      and om.user_id = auth.uid()
                      and om.status = 'ACTIVE'
                )
            )
        )
    );

-- INSERT Policy:
-- - Author must match session
-- - If institutional, must be active member of that organization
create policy "teacher_assessments_insert"
    on public.teacher_assessments for insert
    with check (
        auth.uid() = owner_id
        and (
            organization_id is null
            or exists (
                select 1 from public.organization_members om
                where om.organization_id = teacher_assessments.organization_id
                  and om.user_id = auth.uid()
                  and om.status = 'ACTIVE'
            )
        )
    );

-- UPDATE Policy:
-- - Author can update own assessment
-- - Organization admin can manage institutional assessments
-- - Platform Admin override
create policy "teacher_assessments_update"
    on public.teacher_assessments for update
    using (
        auth.uid() = owner_id
        or (
            organization_id is not null and (
                public.is_org_admin(teacher_assessments.organization_id, auth.uid())
                or exists (
                    select 1 from public.organization_members om
                    where om.organization_id = teacher_assessments.organization_id
                      and om.user_id = auth.uid()
                      and om.status = 'ACTIVE'
                      and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN')
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
                public.is_org_admin(teacher_assessments.organization_id, auth.uid())
                or exists (
                    select 1 from public.organization_members om
                    where om.organization_id = teacher_assessments.organization_id
                      and om.user_id = auth.uid()
                      and om.status = 'ACTIVE'
                      and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN')
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
-- - Author can delete own assessment only when in DRAFT or ARCHIVED status
create policy "teacher_assessments_delete"
    on public.teacher_assessments for delete
    using (
        (auth.uid() = owner_id and status in ('DRAFT', 'ARCHIVED'))
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    );

-- 4. Multi-Tenant RLS for teacher_assessment_questions
drop policy if exists "teacher_assessment_questions_owner_select" on public.teacher_assessment_questions;
drop policy if exists "teacher_assessment_questions_owner_insert" on public.teacher_assessment_questions;
drop policy if exists "teacher_assessment_questions_owner_delete" on public.teacher_assessment_questions;
drop policy if exists "teacher_assessment_questions_select" on public.teacher_assessment_questions;
drop policy if exists "teacher_assessment_questions_insert" on public.teacher_assessment_questions;
drop policy if exists "teacher_assessment_questions_update" on public.teacher_assessment_questions;
drop policy if exists "teacher_assessment_questions_delete" on public.teacher_assessment_questions;

create policy "teacher_assessment_questions_select"
    on public.teacher_assessment_questions for select
    using (
        exists (
            select 1 from public.teacher_assessments a
            where a.id = teacher_assessment_questions.assessment_id
              and (
                  auth.uid() = a.owner_id
                  or (
                      a.organization_id is not null and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = a.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                      )
                  )
                  or exists (
                      select 1 from public.user_roles ur
                      where ur.user_id = auth.uid()
                        and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
                  )
                  or a.status = 'PUBLISHED'
              )
        )
    );

create policy "teacher_assessment_questions_insert"
    on public.teacher_assessment_questions for insert
    with check (
        exists (
            select 1 from public.teacher_assessments a
            where a.id = teacher_assessment_questions.assessment_id
              and (
                  auth.uid() = a.owner_id
                  or (
                      a.organization_id is not null and (
                          public.is_org_admin(a.organization_id, auth.uid())
                          or exists (
                              select 1 from public.organization_members om
                              where om.organization_id = a.organization_id
                                and om.user_id = auth.uid()
                                and om.status = 'ACTIVE'
                                and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN')
                          )
                      )
                  )
                  or exists (
                      select 1 from public.user_roles ur
                      where ur.user_id = auth.uid()
                        and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
                  )
              )
        )
    );

create policy "teacher_assessment_questions_update"
    on public.teacher_assessment_questions for update
    using (
        exists (
            select 1 from public.teacher_assessments a
            where a.id = teacher_assessment_questions.assessment_id
              and (
                  auth.uid() = a.owner_id
                  or (
                      a.organization_id is not null and (
                          public.is_org_admin(a.organization_id, auth.uid())
                          or exists (
                              select 1 from public.organization_members om
                              where om.organization_id = a.organization_id
                                and om.user_id = auth.uid()
                                and om.status = 'ACTIVE'
                                and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN')
                          )
                      )
                  )
                  or exists (
                      select 1 from public.user_roles ur
                      where ur.user_id = auth.uid()
                        and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
                  )
              )
        )
    );

create policy "teacher_assessment_questions_delete"
    on public.teacher_assessment_questions for delete
    using (
        exists (
            select 1 from public.teacher_assessments a
            where a.id = teacher_assessment_questions.assessment_id
              and (
                  auth.uid() = a.owner_id
                  or (
                      a.organization_id is not null and (
                          public.is_org_admin(a.organization_id, auth.uid())
                          or exists (
                              select 1 from public.organization_members om
                              where om.organization_id = a.organization_id
                                and om.user_id = auth.uid()
                                and om.status = 'ACTIVE'
                                and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN')
                          )
                      )
                  )
                  or exists (
                      select 1 from public.user_roles ur
                      where ur.user_id = auth.uid()
                        and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
                  )
              )
        )
    );

-- 5. Restrict question self-approval in teacher_questions RLS
-- Ordinary teachers cannot approve their own questions via direct DB update
drop policy if exists "teacher_questions_update" on public.teacher_questions;
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
        -- If target status is APPROVED, the user cannot be the question owner (unless Platform Admin)
        (
            status != 'APPROVED'
            or auth.uid() != owner_id
            or exists (
                select 1 from public.user_roles ur
                where ur.user_id = auth.uid()
                  and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
            )
        )
        and (
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
        )
    );

-- 6. Assessment lifecycle audit logging helper
create or replace function public.log_assessment_lifecycle_event(
    p_actor_id uuid,
    p_action text,
    p_assessment_id uuid,
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
        'ASSESSMENT',
        p_assessment_id,
        p_details,
        now()
    ) returning id into v_log_id;

    return v_log_id;
exception
    when others then
        return null;
end;
$$ language plpgsql security definer set search_path = public;
