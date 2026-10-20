import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnauthorizedState } from "@/components/ui/states";
import {
  BookOpen,
  CheckCircle,
  Lock,
  Target,
  TrendingUp,
  Plus,
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  History,
} from "lucide-react";
import { ACCOUNT_STATES } from "@/lib/rbac/roles";
import { getStudentSubjects } from "@/lib/services/student-subject.service";
import { LearningPlanService } from "@/lib/services/learning-plan.service";
import { RetentionService } from "@/lib/services/retention.service";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Ecosystem | READY",
  description: "Personalized learning pathways, diagnostic capability verification, and private study notes.",
};

export default async function StudentDashboardPage() {
  const access = await validateEcosystemAccess("STUDENT", "/student");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Student Ecosystem"
          description={access.reason || "You do not have authorization to access the Student workspace."}
          backUrl="/"
        />
      </AppShell>
    );
  }

  const accountState = profile?.account_state || "PENDING";
  const stateMeta = ACCOUNT_STATES[accountState];

  // Fetch student's subjects and recent capability records
  const subjects = await getStudentSubjects(userId);

  // Fetch recent completed assessment if any
  const supabase = await createClient();
  const { data: latestAssessment } = await (supabase
    .from("diagnostic_assessments") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch any weak topic capability states
  const { data: weakTopics } = await (supabase
    .from("topic_capability_states") as any)
    .select("*")
    .eq("user_id", userId)
    .in("classification", ["MISUNDERSTOOD", "FALSE_CONFIDENCE", "UNKNOWN", "FORGOTTEN"])
    .order("updated_at", { ascending: false })
    .limit(4);

  // Calculate high-level aggregates
  const hasSubjects = subjects.length > 0;
  const primarySubject = subjects[0] || null;

  const currentCap = primarySubject?.current_capability_score ?? 0;
  const targetCap = primarySubject?.target_capability_score ?? 80;
  const capabilityGap = Math.max(0, targetCap - currentCap);

  // Fetch active learning plan for primary subject if exists
  let activePlanBundle = null;
  if (primarySubject) {
    activePlanBundle = await LearningPlanService.getActivePlan(userId, primarySubject.id);
  }

  const todayDay = activePlanBundle?.activeTodayDay || null;
  const todayCompletedMinutes =
    todayDay?.items
      .filter((i) => i.status === "COMPLETED")
      .reduce((acc, i) => acc + i.estimated_minutes, 0) || 0;
  const todayTotalMinutes = todayDay?.total_allocated_minutes || primarySubject?.available_daily_study_time || 60;

  // Fetch retention dashboard counts
  const retentionDashboard = await RetentionService.getRetentionDashboard(userId);

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Student Ecosystem</h1>
              <Badge variant="default">Learner Workspace</Badge>
              <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Capability Pipeline: Current Capability &rarr; Target &rarr; Gap &rarr; Plan &rarr; Retention
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/student/subjects/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" />
                Add Subject
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-2 text-xs border-slate-800">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Private Mode</span>
            </Button>
          </div>
        </div>

        {/* Empty State vs Real Dashboard */}
        {!hasSubjects ? (
          <Card className="border-dashed border-slate-800 bg-slate-900/40 p-10 text-center shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 mb-4">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-white">No subjects yet</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 mb-5 leading-relaxed">
              Create your first subject foundation to benchmark your current capability, configure target scores, and uncover your learning gap.
            </p>
            <Link href="/student/subjects/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5 px-4 py-2">
                <Plus className="h-3.5 w-3.5" />
                Add your first subject
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Core Capability Status Cards: Current, Target, Gap */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="glass-card border-slate-800 bg-slate-900/60 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs uppercase font-semibold">Current Capability</span>
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                  <CardTitle className="text-3xl font-extrabold text-white">
                    {currentCap.toFixed(0)}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, currentCap)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {latestAssessment
                      ? `Verified via diagnostic on ${new Date(latestAssessment.created_at).toLocaleDateString()}`
                      : "Diagnostic assessment pending."}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-slate-800 bg-slate-900/60 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs uppercase font-semibold">Target Capability</span>
                    <Target className="h-4 w-4 text-indigo-400" />
                  </div>
                  <CardTitle className="text-3xl font-extrabold text-indigo-300">
                    {targetCap.toFixed(0)}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, targetCap)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Subject: {primarySubject.name} &bull; Target: {primarySubject.target_score}%
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-slate-800 bg-slate-900/60 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs uppercase font-semibold">Capability Gap</span>
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                  </div>
                  <CardTitle className={`text-3xl font-extrabold ${capabilityGap > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                    {capabilityGap.toFixed(0)}% pts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${capabilityGap > 20 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(100, capabilityGap)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Deficit to close prior to target exam deadline.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* DAY 4 FEATURE: TODAY'S LEARNING PLAN */}
            <Card className="border-indigo-800/60 bg-gradient-to-r from-indigo-950/40 via-slate-900/70 to-slate-900/90 shadow-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Today&apos;s Learning Plan
                      </span>
                      {activePlanBundle?.plan && (
                        <Badge variant="outline" className="text-[10px] border-indigo-700/60 text-indigo-300">
                          {activePlanBundle.plan.mode.replace(/_/g, " ")} (v{activePlanBundle.plan.version})
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base text-white mt-1">
                      {todayDay ? `Day ${todayDay.day_number}: ${todayDay.theme}` : `Active Focus: ${primarySubject.name}`}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-200 block">
                        {todayCompletedMinutes} / {todayTotalMinutes} mins
                      </span>
                      <span className="text-[10px] text-slate-400">Scheduled Today</span>
                    </div>

                    <Link href={`/student/plan?subjectId=${primarySubject.id}`}>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1 shadow-md">
                        <span>Full Plan</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-3">
                {!todayDay || todayDay.items.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400 mb-2">
                      Generate your sequenced daily study roadmap for {primarySubject.name}.
                    </p>
                    <Link href={`/student/plan?subjectId=${primarySubject.id}`}>
                      <Button size="sm" variant="outline" className="text-xs border-indigo-800/60 text-indigo-300">
                        Initialize Plan
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayDay.items.slice(0, 4).map((item, idx) => {
                      const isCompleted = item.status === "COMPLETED";
                      const isInProgress = item.status === "IN_PROGRESS";

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                            isCompleted
                              ? "bg-emerald-950/20 border-emerald-800/30 text-slate-400"
                              : isInProgress
                              ? "bg-indigo-950/40 border-indigo-700 text-white font-medium"
                              : "bg-slate-950/50 border-slate-800/80 text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-xs font-bold text-indigo-400 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className={`truncate ${isCompleted ? "line-through text-slate-500" : ""}`}>
                              {item.title}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-700 shrink-0">
                              {item.estimated_minutes}m
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isCompleted ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {item.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spaced Retention Section */}
            <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-4 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  retentionDashboard.counts.dueCount > 0
                    ? "bg-amber-950/60 border-amber-700/60 text-amber-400"
                    : "bg-indigo-950/60 border-indigo-700/60 text-indigo-400"
                }`}>
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Spaced Retention
                    </span>
                    {retentionDashboard.counts.dueCount > 0 ? (
                      <Badge variant="outline" className="text-[10px] border-amber-600/60 text-amber-300">
                        {retentionDashboard.counts.dueCount} Due Today
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-emerald-600/60 text-emerald-300">
                        Up to date
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {retentionDashboard.counts.dueCount > 0
                      ? "Active retrieval checks due across 24h, 7d, or 30d intervals."
                      : `${retentionDashboard.counts.upcomingCount} checks upcoming across scheduled intervals.`}
                  </p>
                </div>
              </div>

              <Link href="/student/retention">
                <Button
                  size="sm"
                  className={`text-xs gap-1.5 shrink-0 shadow-md ${
                    retentionDashboard.counts.dueCount > 0
                      ? "bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                  }`}
                >
                  <span>{retentionDashboard.counts.dueCount > 0 ? "Review Now" : "Retention Hub"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* Active Subject and Upcoming Exam Quick Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Subjects List */}
              <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-400" />
                      Active Subjects ({subjects.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Curriculum structures and diagnostic benchmarks
                    </CardDescription>
                  </div>
                  <Link href="/student/subjects">
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300">
                      View all
                    </Button>
                  </Link>
                </CardHeader>

                <CardContent className="space-y-3">
                  {subjects.slice(0, 3).map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60 flex items-center justify-between hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1">
                        <Link href={`/student/subjects/${sub.id}`}>
                          <h4 className="text-xs font-semibold text-white hover:text-indigo-300 transition-colors">
                            {sub.name}
                          </h4>
                        </Link>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>Prep: {sub.current_prep_level.replace(/_/g, " ")}</span>
                          {sub.exam_date && (
                            <>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-500" />
                                {new Date(sub.exam_date).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="text-slate-400 block text-[10px]">Gap</span>
                          <span className="font-semibold text-amber-400">
                            {Math.max(0, (sub.target_capability_score ?? 80) - (sub.current_capability_score ?? 0)).toFixed(0)}%
                          </span>
                        </div>
                        <Link href={`/student/diagnostic?subjectId=${sub.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700">
                            <Activity className="h-3 w-3 mr-1 text-indigo-400" />
                            Test
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Weak Topics / Remediation Alert */}
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Priority Weak Topics
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    High-priority capability deficiencies
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {!weakTopics || weakTopics.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      No weak topic classifications detected yet. Take a diagnostic to identify priority gaps.
                    </p>
                  ) : (
                    weakTopics.map((wt: any) => (
                      <div
                        key={wt.id}
                        className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-semibold text-white block">{wt.topic_id}</span>
                          <span className="text-[10px] text-amber-400/90 font-medium">
                            {wt.classification.replace(/_/g, " ")}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                          Gap: {Math.max(0, wt.target_capability_score - wt.current_capability_score).toFixed(0)}%
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Student Privacy Banner */}
            <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Student Privacy Guarantee (Private by Default)</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Your private notes, personal learning sessions, and diagnostic response history are strictly private to your user account. Teachers, college administrators, and enterprise recruiters cannot view your private workspace unless you explicitly grant permission.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
