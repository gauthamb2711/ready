import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { getStudentSubjects } from "@/lib/services/student-subject.service";
import { LearningPlanService } from "@/lib/services/learning-plan.service";
import { PlanViewer } from "@/components/student/PlanViewer";
import Link from "next/link";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Clock, Sparkles, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Personalized Learning Plan | READY",
  description: "Evidence-based daily learning roadmap bridging your verified capability gap.",
};

export default async function StudentPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const access = await validateEcosystemAccess("STUDENT", "/student/plan");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Learning Plan"
          description={access.reason || "You must be authenticated as a student to view your learning plan."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  const { subjectId } = await searchParams;
  const subjects = await getStudentSubjects(userId);

  // If no subjects exist, prompt to create first subject
  if (subjects.length === 0) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="max-w-2xl mx-auto space-y-6 py-8 text-center">
          <Card className="border-dashed border-slate-800 bg-slate-900/40 p-8 shadow-xl">
            <BookOpen className="h-10 w-10 text-indigo-400 mx-auto mb-3 opacity-80" />
            <CardTitle className="text-lg text-white font-bold">No Active Subjects</CardTitle>
            <CardDescription className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              To construct a personalized learning plan, first register a subject foundation.
            </CardDescription>
            <Link href="/student/subjects/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">
                Add Subject
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const selectedSubject =
    subjects.find((s) => s.id === subjectId) || subjects[0];

  // Check if exam date is passed
  const isExamPassed =
    selectedSubject.exam_date &&
    new Date(selectedSubject.exam_date).getTime() < new Date().setHours(0, 0, 0, 0);

  if (isExamPassed) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="max-w-2xl mx-auto space-y-6 py-8 text-center">
          <Card className="border-slate-800 bg-slate-900/60 p-8 shadow-xl">
            <Calendar className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <CardTitle className="text-lg text-white font-bold">Target Exam Date Has Passed</CardTitle>
            <CardDescription className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
              The target exam date ({new Date(selectedSubject.exam_date!).toLocaleDateString()}) for{" "}
              <span className="text-white font-semibold">{selectedSubject.name}</span> has passed. Update your exam date or subject baseline to generate a fresh learning plan.
            </CardDescription>
            <Link href={`/student/subjects/${selectedSubject.id}`}>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">
                Update Subject Baseline
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Load or generate active plan
  let planBundle = await LearningPlanService.getActivePlan(userId, selectedSubject.id);

  if (!planBundle) {
    // Generate initial plan automatically using Day 3 capability data
    planBundle = await LearningPlanService.generateOrRegeneratePlan({
      userId,
      subjectId: selectedSubject.id,
      regenerationReason: "Initial plan initialization",
    });
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        {/* Subject switcher if student has multiple subjects */}
        {subjects.length > 1 && (
          <div className="flex items-center gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80 max-w-sm">
            <span className="text-xs text-slate-400 shrink-0 font-medium">Subject:</span>
            <select
              defaultValue={selectedSubject.id}
              onChange={(e) => {
                window.location.href = `/student/plan?subjectId=${e.target.value}`;
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} (Gap: {Math.max(0, (sub.target_capability_score ?? 80) - (sub.current_capability_score ?? 0))}% pts)
                </option>
              ))}
            </select>
          </div>
        )}

        <PlanViewer
          initialPlan={planBundle.plan}
          initialDays={planBundle.days}
          subjectName={selectedSubject.name}
          subjectId={selectedSubject.id}
        />
      </div>
    </AppShell>
  );
}
