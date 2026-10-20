import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherQuestionBankView } from "@/components/teacher/TeacherQuestionBankView";
import { UnauthorizedState } from "@/components/ui/states";
import {
  getTeacherQuestions,
  getTeacherQuestionCounts,
  getTeacherSubjects,
} from "@/lib/services/teacher.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Question Bank | Teacher Ecosystem | READY",
  description: "Teacher Question Bank with quality checks and lifecycle review.",
};

export default async function TeacherQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; status?: string }>;
}) {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/questions");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Question Bank"
          description={access.reason || "You do not have authorization to view the Teacher Question Bank."}
          backUrl="/teacher"
        />
      </AppShell>
    );
  }

  const { subjectId, status } = await searchParams;

  let questions: any[] = [];
  let subjects: any[] = [];
  let counts: any = undefined;

  try {
    const [qRes, sRes, cRes] = await Promise.all([
      getTeacherQuestions(profile.id, {
        subjectId,
        status: status as any,
      }),
      getTeacherSubjects(profile.id),
      getTeacherQuestionCounts(profile.id),
    ]);
    questions = qRes;
    subjects = sRes;
    counts = cRes;
  } catch (err) {
    console.error("[TeacherQuestionsPage] Error:", err);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherQuestionBankView
        initialQuestions={questions}
        subjects={subjects}
        isVerified={access.isPrivilegedVerified}
        initialCounts={counts}
      />
    </AppShell>
  );
}
