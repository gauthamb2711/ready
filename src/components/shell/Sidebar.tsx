"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Briefcase,
  Award,
  BookOpen,
  Building2,
  Building,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Layers,
  LayoutDashboard,
  Calendar,
  Activity,
  History,
  FileText,
  TrendingUp,
  FileQuestion,
  Users,
  Shield,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, UserRoleRecord } from "@/types/database.types";

interface SidebarProps {
  profile: Profile | null;
  roles?: UserRoleRecord[];
}

export function Sidebar({ profile, roles = [] }: SidebarProps) {
  const pathname = usePathname();

  const isPlatformAdminUser =
    roles.some((r) => r.role === "PLATFORM_ADMIN" || r.role === "SECURITY_ADMIN") ||
    profile?.metadata?.system_role === "PLATFORM_ADMIN";

  const isCollegeAdminUser =
    roles.some((r) => ["COLLEGE_ADMIN", "DEPARTMENT_ADMIN", "HOD", "ORGANIZATION_OWNER"].includes(r.role)) ||
    profile?.account_type === "COLLEGE_UNIVERSITY";

  const isTeacherUser =
    roles.some((r) => r.role === "TEACHER" || r.role === "INSTRUCTOR") ||
    profile?.account_type === "TEACHER";

  // Determine active ecosystem scope based on route first, then user's primary profile
  const isPlatformAdminScope = pathname.startsWith("/admin");
  const isCollegeScope = pathname.startsWith("/college");
  const isTeacherScope = pathname.startsWith("/teacher");
  const isStudentScope =
    pathname.startsWith("/student") ||
    (!isPlatformAdminScope && !isCollegeScope && !isTeacherScope && (profile?.account_type === "STUDENT" || !profile?.account_type));
  const isProfessionalScope = pathname.startsWith("/professional") || (!isPlatformAdminScope && !isCollegeScope && !isTeacherScope && !isStudentScope && profile?.account_type === "PROFESSIONAL");
  const isCandidateScope = pathname.startsWith("/candidate") || (!isPlatformAdminScope && !isCollegeScope && !isTeacherScope && !isStudentScope && profile?.account_type === "CANDIDATE");
  const isCompanyScope = pathname.startsWith("/company") || (!isPlatformAdminScope && !isCollegeScope && !isTeacherScope && !isStudentScope && profile?.account_type === "COMPANY");

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl md:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-black tracking-wider text-white shadow-md shadow-indigo-600/30">
          R
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-white text-base">READY</span>
            {isPlatformAdminScope ? (
              <span className="rounded bg-rose-500/10 px-1 py-0.2 text-[9px] font-bold text-rose-400 border border-rose-500/20">
                Admin
              </span>
            ) : isCollegeScope ? (
              <span className="rounded bg-violet-500/10 px-1 py-0.2 text-[9px] font-bold text-violet-400 border border-violet-500/20">
                College
              </span>
            ) : isTeacherScope ? (
              <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                Teacher
              </span>
            ) : (
              <span className="rounded bg-indigo-500/10 px-1 py-0.2 text-[9px] font-bold text-indigo-400 border border-indigo-500/20">
                Student
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 tracking-tight">Capability & Verification</p>
        </div>
      </div>

      {/* Navigation based on active isolated role */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* PLATFORM ADMIN EXCLUSIVE NAVIGATION */}
        {isPlatformAdminScope && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Platform Administration
            </div>
            <nav className="space-y-1">
              <Link
                href="/admin/overview"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname === "/admin/overview" || pathname === "/admin"
                    ? "bg-rose-600/20 text-rose-300 font-semibold border border-rose-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Shield className="h-4 w-4 text-rose-400" />
                <span>Overview & Verification</span>
              </Link>
            </nav>
          </div>
        )}

        {/* COLLEGE ADMIN EXCLUSIVE NAVIGATION */}
        {isCollegeScope && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-violet-400">
              College Administration
            </div>
            <nav className="space-y-1">
              <Link
                href="/college/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname === "/college/dashboard" || pathname === "/college"
                    ? "bg-violet-600/20 text-violet-300 font-semibold border border-violet-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <LayoutDashboard className="h-4 w-4 text-violet-400" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/college/faculty"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/college/faculty")
                    ? "bg-violet-600/20 text-violet-300 font-semibold border border-violet-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Users className="h-4 w-4 text-violet-400" />
                <span>Faculty</span>
              </Link>
              <Link
                href="/college/faculty"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Layers className="h-4 w-4 text-violet-400" />
                <span>Departments</span>
              </Link>
              <Link
                href="/college/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <BookOpen className="h-4 w-4 text-violet-400" />
                <span>Subjects</span>
              </Link>
              <Link
                href="/college/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <FileQuestion className="h-4 w-4 text-violet-400" />
                <span>Question Banks</span>
              </Link>
              <Link
                href="/college/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <FileText className="h-4 w-4 text-violet-400" />
                <span>Assessments</span>
              </Link>
              <Link
                href="/college/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <TrendingUp className="h-4 w-4 text-violet-400" />
                <span>Analytics</span>
              </Link>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/settings")
                    ? "bg-violet-600/20 text-violet-300 font-semibold border border-violet-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Settings className="h-4 w-4 text-violet-400" />
                <span>Settings</span>
              </Link>
            </nav>
          </div>
        )}

        {/* TEACHER EXCLUSIVE NAVIGATION */}
        {isTeacherScope && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Teacher Workspace
            </div>
            <nav className="space-y-1">
              <Link
                href="/teacher/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname === "/teacher/dashboard" || pathname === "/teacher"
                    ? "bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <LayoutDashboard className="h-4 w-4 text-emerald-400" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/teacher/subjects"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/teacher/subjects")
                    ? "bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span>My Subjects</span>
              </Link>
              <Link
                href="/teacher/questions"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/teacher/questions")
                    ? "bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <FileQuestion className="h-4 w-4 text-emerald-400" />
                <span>Question Bank</span>
              </Link>
              <Link
                href="/teacher/assessments"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/teacher/assessments")
                    ? "bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Award className="h-4 w-4 text-emerald-400" />
                <span>Assessments</span>
              </Link>
              <Link
                href="/teacher/organizations"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/teacher/organizations")
                    ? "bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Building2 className="h-4 w-4 text-emerald-400" />
                <span>Organizations & Affiliation</span>
              </Link>
            </nav>
          </div>
        )}

        {/* STUDENT EXCLUSIVE NAVIGATION */}
        {isStudentScope && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Student Workspace
            </div>
            <nav className="space-y-1">
              <Link
                href="/student/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname === "/student/dashboard" || pathname === "/student"
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <LayoutDashboard className="h-4 w-4 text-indigo-400" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/student/subjects"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/student/subjects")
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span>My Subjects</span>
              </Link>
              <Link
                href="/student/plan"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/student/plan")
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Calendar className="h-4 w-4 text-indigo-400" />
                <span>Today&apos;s Plan</span>
              </Link>
              <Link
                href="/student/diagnostic"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/student/diagnostic")
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Activity className="h-4 w-4 text-indigo-400" />
                <span>Diagnostic Intake</span>
              </Link>
              <Link
                href="/student/retention"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/student/retention")
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <History className="h-4 w-4 text-indigo-400" />
                <span>Spaced Retention</span>
              </Link>
              <Link
                href="/student/mock"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/student/mock")
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <FileText className="h-4 w-4 text-indigo-400" />
                <span>Mock Exams</span>
              </Link>
              <Link
                href="/student/readiness"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/student/readiness")
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <span>Readiness Score</span>
              </Link>
              <Link
                href="/student/results"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname.startsWith("/student/results")
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Compass className="h-4 w-4 text-indigo-400" />
                <span>Progress & Results</span>
              </Link>
            </nav>
          </div>
        )}

        {/* CANDIDATE EXCLUSIVE NAVIGATION */}
        {isCandidateScope && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Candidate Workspace
            </div>
            <nav className="space-y-1">
              <Link
                href="/candidate/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname === "/candidate/dashboard" || pathname === "/candidate"
                    ? "bg-amber-600/20 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Briefcase className="h-4 w-4 text-amber-400" />
                <span>Candidate Dashboard</span>
              </Link>
            </nav>
          </div>
        )}

        {/* PROFESSIONAL EXCLUSIVE NAVIGATION */}
        {isProfessionalScope && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Professional Workspace
            </div>
            <nav className="space-y-1">
              <Link
                href="/professional/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname === "/professional/dashboard" || pathname === "/professional"
                    ? "bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Award className="h-4 w-4 text-emerald-400" />
                <span>Professional Dashboard</span>
              </Link>
            </nav>
          </div>
        )}

        {/* COMPANY EXCLUSIVE NAVIGATION */}
        {isCompanyScope && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Company Administration
            </div>
            <nav className="space-y-1">
              <Link
                href="/company/dashboard"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  pathname === "/company/dashboard" || pathname === "/company"
                    ? "bg-cyan-600/20 text-cyan-300 font-semibold border border-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Building className="h-4 w-4 text-cyan-400" />
                <span>Company Dashboard</span>
              </Link>
            </nav>
          </div>
        )}

        {/* Architecture Pipeline Indicator */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs mb-1">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Capability Pipeline</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">
            Capability &rarr; Gap &rarr; Plan &rarr; Action &rarr; Assessment &rarr; Retention
          </p>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-800/80 p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            pathname === "/settings"
              ? "bg-indigo-600/15 text-indigo-200 border border-indigo-500/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          )}
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Account Settings</span>
        </Link>
      </div>
    </aside>
  );
}
