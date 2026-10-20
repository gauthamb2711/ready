import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnauthorizedState } from "@/components/ui/states";
import {
  BookOpen,
  FileQuestion,
  Award,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Building2,
} from "lucide-react";
import { ACCOUNT_STATES } from "@/lib/rbac/roles";
import { getTeacherDashboardStats, getTeacherSubjects } from "@/lib/services/teacher.service";
import {
  getTeacherOrganizations,
  getTeacherJoinRequests,
} from "@/lib/services/organization.service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Teacher / Faculty Ecosystem | READY",
  description: "Curriculum authoring, question banks, student assessment, and capability verification.",
};

export default async function TeacherDashboardPage() {
  const access = await validateEcosystemAccess("TEACHER", "/teacher");
  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Teacher Ecosystem"
          description={access.reason || "You do not have authorization to access the Teacher / Faculty workspace."}
          backUrl="/"
        />
      </AppShell>
    );
  }

  const isVerifiedTeacher = access.isPrivilegedVerified;
  const accountState = profile?.account_state || "PENDING";
  const stateMeta = ACCOUNT_STATES[accountState];

  let stats = {
    verificationStatus: accountState,
    isVerified: isVerifiedTeacher,
    totalSubjects: 0,
    totalTopics: 0,
    totalQuestions: 0,
    approvedQuestions: 0,
    draftQuestions: 0,
    reviewQuestions: 0,
    totalAssessments: 0,
  };

  let subjects: any[] = [];
  let activeOrgs: any[] = [];
  let pendingRequests: any[] = [];

  if (profile) {
    try {
      const [statsData, subData, orgsRes, reqsRes] = await Promise.all([
        getTeacherDashboardStats(profile.id),
        getTeacherSubjects(profile.id),
        getTeacherOrganizations(profile.id),
        getTeacherJoinRequests(profile.id),
      ]);
      stats = statsData;
      subjects = subData;
      activeOrgs = orgsRes.organizations || [];
      pendingRequests = (reqsRes.requests || []).filter((r: any) => r.status === "PENDING");
    } catch (err) {
      console.error("[TeacherDashboard] Error loading dashboard stats:", err);
    }
  }

  const primaryOrg = activeOrgs[0] || null;
  const pendingOrgName = pendingRequests[0]?.organizations?.name || null;

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Teacher / Faculty Ecosystem</h1>
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                {primaryOrg ? "Institutional Faculty" : "Independent Workspace"}
              </Badge>
              <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Curriculum structure, verified question banks, deterministic templates, and assessment foundation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/teacher/subjects">
              <Button variant="primary" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
                <Plus className="h-4 w-4" />
                <span>New Subject</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Institutional Affiliation vs Independent Workspace Status Banner */}
        {primaryOrg ? (
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">
                    Institution: {primaryOrg.organizations?.name || "Verified College"}
                  </h3>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-xs">
                    Role: Teacher
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Active institutional faculty membership verified and managed by College Administration.
                </p>
              </div>
            </div>
            <Link href="/teacher/organizations" className="shrink-0">
              <Button variant="outline" size="sm" className="text-xs border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40">
                View Organization Details
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">Independent Teacher Workspace</h3>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-xs">
                    Independent
                  </Badge>
                  {pendingOrgName && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs">
                      Join Request Pending: {pendingOrgName}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {pendingOrgName
                    ? `Your faculty join request to ${pendingOrgName} is currently awaiting College Admin review. In the meantime, you have full access to author independent curriculum and questions.`
                    : "You are working in your independent teacher workspace. Author curriculum, question banks, and assessments independently, or request affiliation with a verified college anytime."}
                </p>
              </div>
            </div>
            <Link href="/teacher/organizations" className="shrink-0">
              <Button variant="primary" size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{pendingOrgName ? "View Pending Request" : "Join an Institution"}</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Server-Side Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">My Subjects</span>
                <BookOpen className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-white font-mono">{stats.totalSubjects}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-400">{stats.totalTopics} curriculum topics structured</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Question Bank</span>
                <FileQuestion className="h-4 w-4 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-white font-mono">{stats.totalQuestions}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-400">Total authored & generated items</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Approved Questions</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-emerald-400 font-mono">{stats.approvedQuestions}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-400">Ready for assessment assembly</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Review / Draft</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <CardTitle className="text-2xl text-amber-400 font-mono">
                {stats.reviewQuestions + stats.draftQuestions}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-400">
                {stats.reviewQuestions} in review &bull; {stats.draftQuestions} drafts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/teacher/subjects" className="block group">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-emerald-500/40 hover:bg-slate-900/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <BookOpen className="h-4 w-4 text-emerald-400" />
                  <span>My Subjects</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Build curriculum hierarchy: Subject &rarr; Unit &rarr; Topic &rarr; Subtopic &rarr; Learning Objective.
              </p>
            </div>
          </Link>

          <Link href="/teacher/questions" className="block group">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-indigo-500/40 hover:bg-slate-900/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <FileQuestion className="h-4 w-4 text-indigo-400" />
                  <span>Question Bank</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Author MCQs, run deterministic quality checks, detect duplicates, and manage question lifecycles.
              </p>
            </div>
          </Link>

          <Link href="/teacher/assessments" className="block group">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-amber-500/40 hover:bg-slate-900/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>Assessments Foundation</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assemble approved questions into assessment drafts ready for future exam delivery and benchmark grading.
              </p>
            </div>
          </Link>
        </div>

        {/* Subjects & Future Modules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Subjects Summary */}
          <Card className="border-slate-800 bg-slate-950/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-white">Active Curriculum Subjects</CardTitle>
                <CardDescription className="text-xs">
                  Your authored subjects and pedagogical units
                </CardDescription>
              </div>
              <Link href="/teacher/subjects">
                <Button variant="outline" size="sm" className="text-xs border-slate-700">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center">
                  <p className="text-xs text-slate-400 mb-3">No subjects authored yet.</p>
                  <Link href="/teacher/subjects">
                    <Button size="sm" variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30">
                      Create First Subject
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {subjects.slice(0, 4).map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/teacher/subjects/${sub.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/30 p-3 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{sub.name}</span>
                          {sub.code && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 border-slate-700 text-slate-400">
                              {sub.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {sub.description || "No description provided"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                        {sub.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planned Future Sections */}
          <Card className="border-slate-800 bg-slate-950/60">
            <CardHeader>
              <CardTitle className="text-base text-white">Ecosystem Roadmap</CardTitle>
              <CardDescription className="text-xs">
                Upcoming modules scheduled for future READY platform releases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/20 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">📄</span>
                    <div>
                      <p className="text-xs font-medium text-slate-300">Question Papers</p>
                      <p className="text-[10px] text-slate-500">Automated paper generation & PDF export</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-500">
                    Coming in future release
                  </Badge>
                </div>

                <div className="rounded-lg border border-slate-800/60 bg-slate-900/20 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">📦</span>
                    <div>
                      <p className="text-xs font-medium text-slate-300">Teaching Materials</p>
                      <p className="text-[10px] text-slate-500">Slides, code sandboxes, and reading links</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-500">
                    Coming in future release
                  </Badge>
                </div>

                <div className="rounded-lg border border-slate-800/60 bg-slate-900/20 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">🗓️</span>
                    <div>
                      <p className="text-xs font-medium text-slate-300">Lesson Planner</p>
                      <p className="text-[10px] text-slate-500">Academic semester schedule mapping</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-500">
                    Coming in future release
                  </Badge>
                </div>

                <div className="rounded-lg border border-slate-800/60 bg-slate-900/20 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">⚙️</span>
                    <div>
                      <p className="text-xs font-medium text-slate-300">Advanced Faculty Settings</p>
                      <p className="text-[10px] text-slate-500">Institutional affiliations & delegation</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-500">
                    Coming in future release
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
