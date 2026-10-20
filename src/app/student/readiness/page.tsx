import Link from "next/link";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, EmptyState } from "@/components/ui/states";
import { ReadinessService } from "@/lib/services/readiness.service";
import { ReadinessDashboardView } from "@/components/student/ReadinessDashboardView";
import { PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Exam Readiness Score Engine | READY",
  description: "Evidence-based readiness estimation across mastery, retention, and mock performance.",
};

export default async function StudentReadinessPage() {
  const access = await validateEcosystemAccess("STUDENT", "/student/readiness");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Readiness Engine"
          description={access.reason || "You must be an authenticated student to view your exam readiness score."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  const dashboardData = await ReadinessService.getReadinessDashboard(userId);

  if (!dashboardData) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="p-8 max-w-4xl mx-auto">
          <EmptyState
            title="No Subjects Enrolled"
            description="You need to enroll in a subject to start building readiness evidence across diagnostic intake, learning actions, and mock exams."
            action={
              <Link
                href="/student/subjects"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Your First Subject</span>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <ReadinessDashboardView initialData={dashboardData} />
    </AppShell>
  );
}
