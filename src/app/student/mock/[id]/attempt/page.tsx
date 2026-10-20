import { redirect } from "next/navigation";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { MockService } from "@/lib/services/mock.service";
import { MockExamRunner } from "@/components/student/MockExamRunner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mock Exam Attempt | READY",
  description: "Live timed exam simulation.",
};

export default async function MockAttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/student/mock/${id}/attempt`);
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Mock Engine"
          description={access.reason || "You must be an authenticated student to take this mock exam."}
          backUrl="/student/mock"
        />
      </AppShell>
    );
  }

  let attemptData;
  try {
    attemptData = await MockService.startOrResumeAttempt(userId, id);
  } catch (err: any) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <h2 className="text-lg font-bold text-white">Cannot Start Mock Exam</h2>
          <p className="text-xs text-slate-400">{err?.message || "Failed to load attempt."}</p>
        </div>
      </AppShell>
    );
  }

  if (attemptData.attempt.status === "SUBMITTED") {
    redirect(`/student/mock/${id}/result?attemptId=${attemptData.attempt.id}`);
  }

  return (
    <MockExamRunner
      mockExam={attemptData.mockExam}
      attempt={attemptData.attempt}
      questions={attemptData.questions}
      initialResponses={attemptData.savedResponses}
      initialTimeRemainingSeconds={attemptData.timeRemainingSeconds}
    />
  );
}
