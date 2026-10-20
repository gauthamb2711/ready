import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherAssessmentsView } from "@/components/teacher/TeacherAssessmentsView";
import { UnauthorizedState } from "@/components/ui/states";
import {
  getTeacherAssessments,
  getTeacherQuestions,
  getTeacherSubjects,
} from "@/lib/services/teacher.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assessment Builder & Exams | Teacher Ecosystem | READY",
  description: "Assessment blueprints and question assembly for faculty.",
};

export default async function TeacherAssessmentsPage() {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/assessments");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Assessments Foundation"
          description={access.reason || "You do not have authorization to view the Assessments workspace."}
          backUrl="/teacher"
        />
      </AppShell>
    );
  }

  let assessments: any[] = [];
  let subjects: any[] = [];
  let approvedQuestions: any[] = [];

  try {
    const [aRes, sRes, qRes] = await Promise.all([
      getTeacherAssessments(profile.id),
      getTeacherSubjects(profile.id),
      getTeacherQuestions(profile.id, { status: "APPROVED" }),
    ]);
    assessments = aRes;
    subjects = sRes;
    approvedQuestions = qRes;
  } catch (err) {
    console.error("[TeacherAssessmentsPage] Error:", err);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherAssessmentsView
        initialAssessments={assessments}
        subjects={subjects}
        approvedQuestions={approvedQuestions}
        isVerified={access.isPrivilegedVerified}
      />
    </AppShell>
  );
}
