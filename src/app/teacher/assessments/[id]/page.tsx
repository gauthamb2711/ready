import { notFound } from "next/navigation";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherAssessmentDetailView } from "@/components/teacher/TeacherAssessmentDetailView";
import { UnauthorizedState } from "@/components/ui/states";
import { getTeacherAssessmentDetails } from "@/lib/services/teacher.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assessment Blueprint Details | Teacher Ecosystem | READY",
  description: "View assessment blueprint, questions layout, and lifecycle status.",
};

export default async function TeacherAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/assessments");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Assessment Details"
          description={access.reason || "You do not have authorization to view this assessment."}
          backUrl="/teacher/assessments"
        />
      </AppShell>
    );
  }

  const { id: assessmentId } = await params;

  let assessmentData: any = null;
  try {
    assessmentData = await getTeacherAssessmentDetails(profile.id, assessmentId);
  } catch (err) {
    console.error("[TeacherAssessmentDetailPage] Load error:", err);
  }

  if (!assessmentData) {
    notFound();
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherAssessmentDetailView
        initialAssessment={assessmentData.assessment}
        initialQuestions={assessmentData.questions}
        isVerified={access.isPrivilegedVerified}
      />
    </AppShell>
  );
}
