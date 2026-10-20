import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherQuestionEditor } from "@/components/teacher/TeacherQuestionEditor";
import { UnauthorizedState } from "@/components/ui/states";
import { getTeacherQuestions, getTeacherSubjects } from "@/lib/services/teacher.service";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Question Draft | Teacher Ecosystem | READY",
  description: "Create and validate questions with deterministic quality checks.",
};

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; unitId?: string; topicId?: string }>;
}) {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/questions/new");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Question Authoring"
          description={access.reason || "You do not have authorization to author questions."}
          backUrl="/teacher/questions"
        />
      </AppShell>
    );
  }

  const { subjectId, unitId, topicId } = await searchParams;

  let subjects: any[] = [];
  let existingQuestions: any[] = [];

  try {
    const [sRes, qRes] = await Promise.all([
      getTeacherSubjects(profile.id),
      getTeacherQuestions(profile.id),
    ]);
    subjects = sRes;
    existingQuestions = qRes.map((q) => ({ id: q.id, question_text: q.question_text }));
  } catch (err) {
    console.error("[NewQuestionPage] Error:", err);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherQuestionEditor
        subjects={subjects}
        preselectedSubjectId={subjectId}
        preselectedUnitId={unitId}
        preselectedTopicId={topicId}
        existingQuestions={existingQuestions}
      />
    </AppShell>
  );
}
