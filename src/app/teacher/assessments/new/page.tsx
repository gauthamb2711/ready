import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherAssessmentBuilderView } from "@/components/teacher/TeacherAssessmentBuilderView";
import { UnauthorizedState } from "@/components/ui/states";
import { getTeacherQuestions, getTeacherSubjects } from "@/lib/services/teacher.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assessment Builder | Teacher Ecosystem | READY",
  description: "Create diagnostic papers, quizzes, and exam blueprints.",
};

export default async function TeacherNewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/assessments/new");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Assessment Builder"
          description={access.reason || "You do not have authorization to access the Assessment Builder."}
          backUrl="/teacher/assessments"
        />
      </AppShell>
    );
  }

  const { subjectId } = await searchParams;

  let subjects: any[] = [];
  let questionBank: any[] = [];

  try {
    const [sRes, qRes] = await Promise.all([
      getTeacherSubjects(profile.id),
      getTeacherQuestions(profile.id),
    ]);
    subjects = sRes;
    questionBank = qRes;
  } catch (err) {
    console.error("[TeacherNewAssessmentPage] Load error:", err);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherAssessmentBuilderView
        subjects={subjects}
        questionBank={questionBank}
        isVerified={access.isPrivilegedVerified}
        defaultSubjectId={subjectId}
      />
    </AppShell>
  );
}
