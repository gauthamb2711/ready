import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { getSubjectWithCurriculum } from "@/lib/services/student-subject.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import { CurriculumManager } from "@/components/student/CurriculumManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subject Curriculum | READY",
  description: "Curriculum hierarchy: Unit, Topic, Subtopic, and Learning Objective tree.",
};

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await validateEcosystemAccess("STUDENT", "/student/subjects");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted"
          description={access.reason || "You must be authenticated to view this subject."}
          backUrl="/student/subjects"
        />
      </AppShell>
    );
  }

  const { id } = await params;
  const hierarchy = await getSubjectWithCurriculum(userId, id);

  if (!hierarchy) {
    notFound();
  }

  const { subject, units } = hierarchy;
  const currentCap = subject.current_capability_score ?? 0;
  const targetCap = subject.target_capability_score ?? 80;
  const gap = Math.max(0, targetCap - currentCap);

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/student/subjects" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Subjects
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className="text-white font-medium truncate max-w-xs">{subject.name}</span>
        </div>

        {/* Subject Header Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">{subject.name}</h1>
                <Badge variant="outline" className="text-xs border-indigo-700/60 text-indigo-300">
                  Target: {subject.target_score}%
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {subject.current_prep_level.replace(/_/g, " ")}
                </Badge>
              </div>

              {subject.description && (
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  {subject.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                {subject.exam_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Exam: {new Date(subject.exam_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Study Commitment: {subject.available_daily_study_time} min/day</span>
                </div>
              </div>
            </div>

            {/* Diagnostic CTA & Capability Stat Block */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
              <Link href={`/student/diagnostic?subjectId=${subject.id}`}>
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-2 shadow-lg shadow-indigo-600/20">
                  <Activity className="h-4 w-4" />
                  Run Diagnostic Assessment
                </Button>
              </Link>

              <div className="flex items-center gap-4 text-xs bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg">
                <div>
                  <span className="text-slate-500 block text-[10px]">Current</span>
                  <span className="font-semibold text-white">{currentCap.toFixed(0)}%</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Target</span>
                  <span className="font-semibold text-indigo-300">{targetCap.toFixed(0)}%</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Gap</span>
                  <span className={`font-semibold ${gap > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                    {gap.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum Hierarchy Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Curriculum Hierarchy
              </h2>
              <p className="text-xs text-slate-400">
                Subject &rarr; Unit &rarr; Topic &rarr; Subtopic &rarr; Learning Objective
              </p>
            </div>
          </div>

          {/* Interactive Curriculum Manager Component */}
          <CurriculumManager subjectId={subject.id} initialUnits={units} />
        </div>
      </div>
    </AppShell>
  );
}
