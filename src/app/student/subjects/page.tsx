import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { getStudentSubjects } from "@/lib/services/student-subject.service";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Calendar, Clock, ArrowRight, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Subjects | READY",
  description: "Curriculum foundation, unit structures, and active learning diagnostics.",
};

export default async function StudentSubjectsPage() {
  const access = await validateEcosystemAccess("STUDENT", "/student/subjects");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Student Subjects"
          description={access.reason || "You must be authenticated as a student to manage subjects."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  const subjects = await getStudentSubjects(userId);

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-indigo-400" />
                Student Subjects
              </h1>
              <Badge variant="outline" className="text-xs">
                {subjects.length} Active
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Curriculum architecture, unit topics, and capability status tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/student/subjects/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" />
                Add Subject
              </Button>
            </Link>
          </div>
        </div>

        {/* Subject Cards or Empty State */}
        {subjects.length === 0 ? (
          <Card className="border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No subjects yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Add your first academic course or certification syllabus to establish your baseline and diagnostic gap.
            </p>
            <Link href="/student/subjects/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" />
                Add your first subject
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((sub) => {
              const currentCap = sub.current_capability_score ?? 0;
              const targetCap = sub.target_capability_score ?? 80;
              const gap = Math.max(0, targetCap - currentCap);

              return (
                <Card key={sub.id} className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base text-white hover:text-indigo-300 transition-colors">
                          <Link href={`/student/subjects/${sub.id}`}>
                            {sub.name}
                          </Link>
                        </CardTitle>
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {sub.current_prep_level.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs font-semibold text-indigo-400 border-indigo-800/60">
                        Target: {sub.target_score}%
                      </Badge>
                    </div>

                    {sub.description && (
                      <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-2">
                        {sub.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 text-xs text-slate-300 pb-3">
                    {/* Capability Gap Metrics */}
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Current Capability</span>
                        <span className="font-semibold text-white">{currentCap.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, currentCap)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>Target: {targetCap.toFixed(0)}%</span>
                        <span className={`font-medium ${gap > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                          Gap: {gap.toFixed(0)}% pts
                        </span>
                      </div>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      {sub.exam_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          <span>{new Date(sub.exam_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>{sub.available_daily_study_time}m/day</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                    <Link href={`/student/diagnostic?subjectId=${sub.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-400 hover:text-indigo-300 px-2 gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        Diagnostic
                      </Button>
                    </Link>
                    <Link href={`/student/subjects/${sub.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-slate-700">
                        <span>Curriculum</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
