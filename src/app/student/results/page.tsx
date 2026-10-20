import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Diagnostic Results | READY",
  description: "Recent diagnostic assessment history and verified capability outcomes.",
};

export default async function StudentResultsOverviewPage() {
  const access = await validateEcosystemAccess("STUDENT", "/student/results");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted"
          description={access.reason || "You must be authenticated as a student to view diagnostic results."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  // Fetch the latest completed diagnostic assessment
  const supabase = await createClient();
  const { data: latestAssessment } = await (supabase
    .from("diagnostic_assessments") as any)
    .select("id, subject_id, status, created_at")
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestAssessment) {
    redirect(`/student/diagnostic/${latestAssessment.id}/results`);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="max-w-2xl mx-auto space-y-6 py-6 text-center">
        <Card className="border-dashed border-slate-800 bg-slate-900/40 p-8">
          <Activity className="h-10 w-10 text-indigo-400 mx-auto mb-3 opacity-80" />
          <CardTitle className="text-lg text-white font-bold">No Completed Diagnostics Yet</CardTitle>
          <CardDescription className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Take an intake and benchmark diagnostic on any of your active subjects to view capability gaps and classifications.
          </CardDescription>

          <Link href="/student/subjects">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Go to My Subjects
            </Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
