import { notFound } from "next/navigation";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherAssessmentEditView } from "@/components/teacher/TeacherAssessmentEditView";
import { UnauthorizedState } from "@/components/ui/states";
import {
  getTeacherAssessmentDetails,
  getTeacherQuestions,
} from "@/lib/services/teacher.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Assessment Blueprint | Teacher Ecosystem | READY",
  description: "Modify assessment settings, schedules, and questions layout.",
};

export default async function TeacherAssessmentEditPage({
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
          title="Access Restricted: Edit Assessment"
          description={access.reason || "You do not have authorization to edit this assessment."}
          backUrl="/teacher/assessments"
        />
      </AppShell>
    );
  }

  const { id: assessmentId } = await params;

  let assessmentData: any = null;
  let questionBank: any[] = [];

  try {
    const [aRes, qRes] = await Promise.all([
      getTeacherAssessmentDetails(profile.id, assessmentId),
      getTeacherQuestions(profile.id),
    ]);
    assessmentData = aRes;
    questionBank = qRes;
  } catch (err) {
    console.error("[TeacherAssessmentEditPage] Load error:", err);
  }

  if (!assessmentData) {
    notFound();
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherAssessmentEditView
        initialAssessment={assessmentData.assessment}
        initialQuestions={assessmentData.questions}
        questionBank={questionBank}
        isVerified={access.isPrivilegedVerified}
      />
    </AppShell>
  );
}
