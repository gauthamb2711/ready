import Link from "next/link";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, EmptyState } from "@/components/ui/states";
import { MockService } from "@/lib/services/mock.service";
import { MockDashboardView } from "@/components/student/MockDashboardView";
import { PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mock Exam Engine | READY",
  description: "Timed exam simulation with enforced durations, topic balance, and server-side scoring.",
};

export default async function StudentMockDashboardPage() {
  const access = await validateEcosystemAccess("STUDENT", "/student/mock");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Mock Engine"
          description={access.reason || "You must be an authenticated student to access mock exams."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  const dashboardData = await MockService.getMockDashboard(userId);

  if (dashboardData.subjects.length === 0) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="p-8 max-w-4xl mx-auto">
          <EmptyState
            title="No Subjects Enrolled"
            description="To take a mock exam, you need to enroll in a subject first."
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
      <MockDashboardView initialData={dashboardData} />
    </AppShell>
  );
}
