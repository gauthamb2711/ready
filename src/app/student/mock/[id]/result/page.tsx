import Link from "next/link";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, EmptyState } from "@/components/ui/states";
import { MockService } from "@/lib/services/mock.service";
import { MockResultAnalysisView } from "@/components/student/MockResultAnalysisView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mock Exam Result Analysis | READY",
  description: "Verified topic-level performance analysis and readiness impact.",
};

export default async function MockResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const { id } = await params;
  const { attemptId } = await searchParams;
  const access = await validateEcosystemAccess("STUDENT", `/student/mock/${id}/result`);
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Mock Engine"
          description={access.reason || "You must be an authenticated student to view this mock exam result."}
          backUrl="/student/mock"
        />
      </AppShell>
    );
  }

  // If attemptId is not explicitly in query, find the latest completed attempt for this mock
  let resolvedAttemptId = attemptId;
  if (!resolvedAttemptId) {
    const supabase = await createClient();
    const { data: attempts } = await (supabase.from("mock_exam_attempts") as any)
      .select("id")
      .eq("mock_exam_id", id)
      .eq("user_id", userId)
      .in("status", ["SUBMITTED", "EXPIRED"])
      .order("submitted_at", { ascending: false })
      .limit(1);

    if (attempts && attempts.length > 0) {
      resolvedAttemptId = attempts[0].id;
    }
  }

  if (!resolvedAttemptId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="p-8 max-w-xl mx-auto">
          <EmptyState
            title="No Results Found"
            description="No completed attempts were found for this mock examination."
            action={
              <Link
                href={`/student/mock/${id}/attempt`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Start an Attempt
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  try {
    const resultData = await MockService.getMockExamResult(userId, resolvedAttemptId);

    return (
      <AppShell profile={profile} roles={roles}>
        <MockResultAnalysisView
          attempt={resultData.attempt}
          mockExam={resultData.mockExam}
          subject={resultData.subject}
          topicPerformance={resultData.topicPerformance}
          reviewItems={resultData.reviewItems}
        />
      </AppShell>
    );
  } catch (err: any) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <h2 className="text-lg font-bold text-white">Result Not Available</h2>
          <p className="text-xs text-slate-400">{err?.message || "Failed to load result analysis."}</p>
          <Link
            href="/student/mock"
            className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Back to Mocks
          </Link>
        </div>
      </AppShell>
    );
  }
}
