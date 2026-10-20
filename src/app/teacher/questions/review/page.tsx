import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherReviewQueueView } from "@/components/teacher/TeacherReviewQueueView";
import { UnauthorizedState } from "@/components/ui/states";
import { getTeacherQuestions, getTeacherSubjects } from "@/lib/services/teacher.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review Queue | Teacher Ecosystem | READY",
  description: "Review pending questions with quality checklists and audit trails.",
};

export default async function TeacherQuestionsReviewPage() {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/questions/review");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Question Review Queue"
          description={access.reason || "You do not have authorization to review questions."}
          backUrl="/teacher/questions"
        />
      </AppShell>
    );
  }

  let pendingQuestions: any[] = [];
  let subjects: any[] = [];

  try {
    const [qRes, sRes] = await Promise.all([
      getTeacherQuestions(profile.id, { status: "REVIEW" }),
      getTeacherSubjects(profile.id),
    ]);
    pendingQuestions = qRes;
    subjects = sRes;
  } catch (err) {
    console.error("[TeacherQuestionsReviewPage] Error:", err);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherReviewQueueView
        pendingQuestions={pendingQuestions}
        subjects={subjects}
        isVerified={access.isPrivilegedVerified}
      />
    </AppShell>
  );
}
