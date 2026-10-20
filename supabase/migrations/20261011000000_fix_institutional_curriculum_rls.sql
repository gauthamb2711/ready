-- ==============================================================================
-- READY Platform - Institutional Curriculum Collaboration & RLS Alignment
-- Migration: 20261011000000_fix_institutional_curriculum_rls.sql
-- Status: UNAPPLIED (Local migration file for deployment pipeline)
-- ==============================================================================
-- 1. Updates teacher_curriculum_units RLS:
--    - Independent teachers manage units under their own subjects.
--    - Institutional teachers can view, add, and collaborate on units under
--      subjects belonging to their active organization.
--    - Enforces tenant isolation, owner binding, and parent-child subject integrity.
-- 2. Updates teacher_curriculum_topics RLS:
--    - Enforces unit_id and subject_id parent-child consistency (anti-orphaning).
--    - Multi-tenant organizational access for active faculty members.
-- 3. Updates teacher_curriculum_subtopics & teacher_learning_objectives RLS:
--    - Allows collaboration on institutional syllabus trees while preventing
--      unauthorized cross-tenant manipulation or hierarchy tampering.
-- ==============================================================================

-- ==============================================================================
-- 1. teacher_curriculum_units
-- ==============================================================================
drop policy if exists "teacher_units_owner_select" on public.teacher_curriculum_units;
drop policy if exists "teacher_units_select" on public.teacher_curriculum_units;
create policy "teacher_units_select"
    on public.teacher_curriculum_units for select
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_units.subject_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
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

drop policy if exists "teacher_units_owner_insert" on public.teacher_curriculum_units;
drop policy if exists "teacher_units_insert" on public.teacher_curriculum_units;
create policy "teacher_units_insert"
    on public.teacher_curriculum_units for insert
    with check (
        auth.uid() = owner_id
        and exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_units.subject_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                      )
                  )
              )
        )
    );

drop policy if exists "teacher_units_owner_update" on public.teacher_curriculum_units;
drop policy if exists "teacher_units_update" on public.teacher_curriculum_units;
create policy "teacher_units_update"
    on public.teacher_curriculum_units for update
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_units.subject_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
                    and om.user_id = auth.uid()
                    and om.status = 'ACTIVE'
                    and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
              )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    )
    with check (
        exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_units.subject_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                            and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
                      )
                  )
              )
        )
    );

drop policy if exists "teacher_units_owner_delete" on public.teacher_curriculum_units;
drop policy if exists "teacher_units_delete" on public.teacher_curriculum_units;
create policy "teacher_units_delete"
    on public.teacher_curriculum_units for delete
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_units.subject_id
              and s.organization_id is not null
              and (
                  public.is_org_admin(s.organization_id, auth.uid())
                  or exists (
                      select 1 from public.organization_members om
                      where om.organization_id = s.organization_id
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

-- ==============================================================================
-- 2. teacher_curriculum_topics
-- ==============================================================================
drop policy if exists "teacher_topics_owner_select" on public.teacher_curriculum_topics;
drop policy if exists "teacher_topics_select" on public.teacher_curriculum_topics;
create policy "teacher_topics_select"
    on public.teacher_curriculum_topics for select
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_topics.subject_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
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

drop policy if exists "teacher_topics_owner_insert" on public.teacher_curriculum_topics;
drop policy if exists "teacher_topics_insert" on public.teacher_curriculum_topics;
create policy "teacher_topics_insert"
    on public.teacher_curriculum_topics for insert
    with check (
        auth.uid() = owner_id
        and exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_topics.subject_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                      )
                  )
              )
        )
        -- Parent hierarchy integrity: unit_id MUST belong to this exact subject_id
        and exists (
            select 1 from public.teacher_curriculum_units u
            where u.id = teacher_curriculum_topics.unit_id
              and u.subject_id = teacher_curriculum_topics.subject_id
        )
    );

drop policy if exists "teacher_topics_owner_update" on public.teacher_curriculum_topics;
drop policy if exists "teacher_topics_update" on public.teacher_curriculum_topics;
create policy "teacher_topics_update"
    on public.teacher_curriculum_topics for update
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_topics.subject_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
                    and om.user_id = auth.uid()
                    and om.status = 'ACTIVE'
                    and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
              )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    )
    with check (
        exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_topics.subject_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                            and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
                      )
                  )
              )
        )
        and exists (
            select 1 from public.teacher_curriculum_units u
            where u.id = teacher_curriculum_topics.unit_id
              and u.subject_id = teacher_curriculum_topics.subject_id
        )
    );

drop policy if exists "teacher_topics_owner_delete" on public.teacher_curriculum_topics;
drop policy if exists "teacher_topics_delete" on public.teacher_curriculum_topics;
create policy "teacher_topics_delete"
    on public.teacher_curriculum_topics for delete
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_subjects s
            where s.id = teacher_curriculum_topics.subject_id
              and s.organization_id is not null
              and (
                  public.is_org_admin(s.organization_id, auth.uid())
                  or exists (
                      select 1 from public.organization_members om
                      where om.organization_id = s.organization_id
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

-- ==============================================================================
-- 3. teacher_curriculum_subtopics
-- ==============================================================================
drop policy if exists "teacher_subtopics_owner_select" on public.teacher_curriculum_subtopics;
drop policy if exists "teacher_subtopics_select" on public.teacher_curriculum_subtopics;
create policy "teacher_subtopics_select"
    on public.teacher_curriculum_subtopics for select
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_curriculum_topics t
            join public.teacher_subjects s on s.id = t.subject_id
            where t.id = teacher_curriculum_subtopics.topic_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
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

drop policy if exists "teacher_subtopics_owner_insert" on public.teacher_curriculum_subtopics;
drop policy if exists "teacher_subtopics_insert" on public.teacher_curriculum_subtopics;
create policy "teacher_subtopics_insert"
    on public.teacher_curriculum_subtopics for insert
    with check (
        auth.uid() = owner_id
        and exists (
            select 1 from public.teacher_curriculum_topics t
            join public.teacher_subjects s on s.id = t.subject_id
            where t.id = teacher_curriculum_subtopics.topic_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                      )
                  )
              )
        )
    );

drop policy if exists "teacher_subtopics_owner_update" on public.teacher_curriculum_subtopics;
drop policy if exists "teacher_subtopics_update" on public.teacher_curriculum_subtopics;
create policy "teacher_subtopics_update"
    on public.teacher_curriculum_subtopics for update
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_curriculum_topics t
            join public.teacher_subjects s on s.id = t.subject_id
            where t.id = teacher_curriculum_subtopics.topic_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
                    and om.user_id = auth.uid()
                    and om.status = 'ACTIVE'
                    and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
              )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    )
    with check (
        exists (
            select 1 from public.teacher_curriculum_topics t
            join public.teacher_subjects s on s.id = t.subject_id
            where t.id = teacher_curriculum_subtopics.topic_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                            and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
                      )
                  )
              )
        )
    );

-- ==============================================================================
-- 4. teacher_learning_objectives
-- ==============================================================================
drop policy if exists "teacher_objectives_owner_select" on public.teacher_learning_objectives;
drop policy if exists "teacher_objectives_select" on public.teacher_learning_objectives;
create policy "teacher_objectives_select"
    on public.teacher_learning_objectives for select
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_curriculum_subtopics st
            join public.teacher_curriculum_topics t on t.id = st.topic_id
            join public.teacher_subjects s on s.id = t.subject_id
            where st.id = teacher_learning_objectives.subtopic_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
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

drop policy if exists "teacher_objectives_owner_insert" on public.teacher_learning_objectives;
drop policy if exists "teacher_objectives_insert" on public.teacher_learning_objectives;
create policy "teacher_objectives_insert"
    on public.teacher_learning_objectives for insert
    with check (
        auth.uid() = owner_id
        and exists (
            select 1 from public.teacher_curriculum_subtopics st
            join public.teacher_curriculum_topics t on t.id = st.topic_id
            join public.teacher_subjects s on s.id = t.subject_id
            where st.id = teacher_learning_objectives.subtopic_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                      )
                  )
              )
        )
    );

drop policy if exists "teacher_objectives_owner_update" on public.teacher_learning_objectives;
drop policy if exists "teacher_objectives_update" on public.teacher_learning_objectives;
create policy "teacher_objectives_update"
    on public.teacher_learning_objectives for update
    using (
        auth.uid() = owner_id
        or exists (
            select 1 from public.teacher_curriculum_subtopics st
            join public.teacher_curriculum_topics t on t.id = st.topic_id
            join public.teacher_subjects s on s.id = t.subject_id
            where st.id = teacher_learning_objectives.subtopic_id
              and s.organization_id is not null
              and exists (
                  select 1 from public.organization_members om
                  where om.organization_id = s.organization_id
                    and om.user_id = auth.uid()
                    and om.status = 'ACTIVE'
                    and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
              )
        )
        or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role in ('PLATFORM_ADMIN', 'SECURITY_ADMIN')
        )
    )
    with check (
        exists (
            select 1 from public.teacher_curriculum_subtopics st
            join public.teacher_curriculum_topics t on t.id = st.topic_id
            join public.teacher_subjects s on s.id = t.subject_id
            where st.id = teacher_learning_objectives.subtopic_id
              and (
                  s.owner_id = auth.uid()
                  or (
                      s.organization_id is not null
                      and exists (
                          select 1 from public.organization_members om
                          where om.organization_id = s.organization_id
                            and om.user_id = auth.uid()
                            and om.status = 'ACTIVE'
                            and om.role::text in ('COLLEGE_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'INSTRUCTOR')
                      )
                  )
              )
        )
    );
