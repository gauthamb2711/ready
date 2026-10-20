-- ==============================================================================
-- READY Platform - Permissions & Roles Initial Seed Data
-- ==============================================================================

-- 1. Insert Base Permissions
insert into public.permissions (code, name, category, description) values
-- Student permissions
('learning:plan:read', 'View Learning Plan', 'LEARNING', 'Allows viewing personal learning plans'),
('learning:plan:write', 'Edit Learning Plan', 'LEARNING', 'Allows modifying personal learning plans'),
('learning:notes:private', 'Manage Private Notes', 'PRIVACY', 'Allows managing personal private student notes'),
('assessment:take', 'Take Assessments', 'ASSESSMENT', 'Allows starting and submitting assessments'),
('assessment:result:view_own', 'View Own Results', 'ASSESSMENT', 'Allows viewing personal assessment results'),

-- Teacher / Instructor permissions
('course:create', 'Create Course', 'ACADEMIC', 'Allows creating new courses and syllabi'),
('course:edit', 'Edit Course', 'ACADEMIC', 'Allows modifying existing course material'),
('question:create', 'Create Questions', 'ASSESSMENT', 'Allows authoring questions in question banks'),
('assessment:create', 'Create Assessment', 'ASSESSMENT', 'Allows publishing assessments'),
('assessment:grade', 'Grade Assessment', 'ASSESSMENT', 'Allows grading student submissions'),

-- College Admin permissions
('org:college:manage', 'Manage College', 'ORGANIZATION', 'Allows managing college members, departments, and programs'),
('org:college:reports', 'View College Reports', 'ORGANIZATION', 'Allows viewing aggregated institutional analytics'),

-- Company Admin permissions
('org:company:manage', 'Manage Company', 'ORGANIZATION', 'Allows managing company workspace and member access'),
('candidate:profile:view', 'View Verified Candidate Profiles', 'RECRUITING', 'Allows viewing public/verified candidate profiles'),

-- Platform Admin & Security
('platform:admin', 'Platform Superadmin', 'SYSTEM', 'Full platform operational access'),
('security:audit:read', 'View Security Logs', 'SECURITY', 'Allows inspecting security events and audit trails')
on conflict (code) do nothing;

-- 2. Map Permissions to Roles
insert into public.role_permissions (role, permission_code) values
-- STUDENT
('STUDENT', 'learning:plan:read'),
('STUDENT', 'learning:plan:write'),
('STUDENT', 'learning:notes:private'),
('STUDENT', 'assessment:take'),
('STUDENT', 'assessment:result:view_own'),

-- CANDIDATE
('CANDIDATE', 'learning:plan:read'),
('CANDIDATE', 'assessment:take'),
('CANDIDATE', 'assessment:result:view_own'),

-- PROFESSIONAL
('PROFESSIONAL', 'learning:plan:read'),
('PROFESSIONAL', 'learning:plan:write'),
('PROFESSIONAL', 'assessment:take'),

-- TEACHER
('TEACHER', 'course:create'),
('TEACHER', 'course:edit'),
('TEACHER', 'question:create'),
('TEACHER', 'assessment:create'),
('TEACHER', 'assessment:grade'),

-- INSTRUCTOR
('INSTRUCTOR', 'course:edit'),
('INSTRUCTOR', 'assessment:grade'),

-- COLLEGE_ADMIN
('COLLEGE_ADMIN', 'org:college:manage'),
('COLLEGE_ADMIN', 'org:college:reports'),

-- COMPANY_ADMIN
('COMPANY_ADMIN', 'org:company:manage'),
('COMPANY_ADMIN', 'candidate:profile:view'),

-- RECRUITER
('RECRUITER', 'candidate:profile:view'),

-- PLATFORM_ADMIN
('PLATFORM_ADMIN', 'platform:admin'),
('PLATFORM_ADMIN', 'security:audit:read'),

-- SECURITY_ADMIN
('SECURITY_ADMIN', 'security:audit:read')
on conflict (role, permission_code) do nothing;
