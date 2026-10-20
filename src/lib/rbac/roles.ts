import type { AccountType, AccountState, SystemRole } from "@/types/database.types";

export const ACCOUNT_TYPES: Record<AccountType, { label: string; description: string; defaultPath: string }> = {
  STUDENT: {
    label: "Student Ecosystem",
    description: "Personalized learning pathways, diagnostic capability verification, and practice.",
    defaultPath: "/student/dashboard",
  },
  CANDIDATE: {
    label: "Candidate Ecosystem",
    description: "Standardized skill benchmarking, verified credentials, and hiring readiness.",
    defaultPath: "/candidate/dashboard",
  },
  PROFESSIONAL: {
    label: "Professional Ecosystem",
    description: "Targeted skill upgrades, professional credentials, and retention tracking.",
    defaultPath: "/professional/dashboard",
  },
  TEACHER: {
    label: "Teacher / Faculty Ecosystem",
    description: "Curriculum authoring, question banking, student assessments, and grading.",
    defaultPath: "/teacher/dashboard",
  },
  COLLEGE_UNIVERSITY: {
    label: "College / University Ecosystem",
    description: "Institutional multi-tenant management, department programs, and outcome analytics.",
    defaultPath: "/college/dashboard",
  },
  COMPANY: {
    label: "Company / Organization Ecosystem",
    description: "Workforce upskilling, talent pipeline assessment, and verified hire evaluation.",
    defaultPath: "/company/dashboard",
  },
};

export const ACCOUNT_STATES: Record<AccountState, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
  PENDING: { label: "Pending Verification", variant: "warning" },
  ACTIVE: { label: "Active", variant: "success" },
  VERIFIED: { label: "Verified", variant: "default" },
  REJECTED: { label: "Application Rejected", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  REVOKED: { label: "Access Revoked", variant: "destructive" },
};

export const SYSTEM_ROLES: Record<SystemRole, { title: string; category: "LEARNER" | "ACADEMIC" | "INSTITUTION" | "ENTERPRISE" | "PLATFORM" }> = {
  STUDENT: { title: "Student", category: "LEARNER" },
  CANDIDATE: { title: "Candidate", category: "LEARNER" },
  PROFESSIONAL: { title: "Professional", category: "LEARNER" },
  TEACHER: { title: "Teacher", category: "ACADEMIC" },
  INSTRUCTOR: { title: "Course Instructor", category: "ACADEMIC" },
  COLLEGE_ADMIN: { title: "College Administrator", category: "INSTITUTION" },
  DEPARTMENT_ADMIN: { title: "Department Administrator", category: "INSTITUTION" },
  EXAM_ADMIN: { title: "Examination Administrator", category: "INSTITUTION" },
  COMPANY_ADMIN: { title: "Company Administrator", category: "ENTERPRISE" },
  RECRUITER: { title: "Talent Recruiter", category: "ENTERPRISE" },
  TRAINING_MANAGER: { title: "Training Manager", category: "ENTERPRISE" },
  ASSESSMENT_MANAGER: { title: "Assessment Manager", category: "ENTERPRISE" },
  PLATFORM_ADMIN: { title: "Platform Super Administrator", category: "PLATFORM" },
  SECURITY_ADMIN: { title: "Security Administrator", category: "PLATFORM" },
  SUPPORT_ADMIN: { title: "Support Administrator", category: "PLATFORM" },
};
