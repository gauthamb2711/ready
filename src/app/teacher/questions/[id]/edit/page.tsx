import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherQuestionEditor } from "@/components/teacher/TeacherQuestionEditor";
import { UnauthorizedState } from "@/components/ui/states";
import {
  getTeacherQuestionDetails,
  getTeacherQuestions,
  getTeacherSubjects,
} from "@/lib/services/teacher.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Question | Teacher Ecosystem | READY",
  description: "Edit and revise draft questions with quality checks.",
};

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/questions");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Question Authoring"
          description={access.reason || "You do not have authorization to edit questions."}
          backUrl="/teacher/questions"
        />
      </AppShell>
    );
  }

  const { id: questionId } = await params;
  const question = await getTeacherQuestionDetails(profile.id, questionId);

  if (!question) {
    notFound();
  }

  // Immutability check: APPROVED questions cannot be modified directly
  if (question.status === "APPROVED") {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Question Cannot Be Modified"
          description="Approved questions are locked to ensure assessment integrity. Archive or create a new question instead."
          backUrl={`/teacher/questions/${questionId}`}
        />
      </AppShell>
    );
  }

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
    console.error("[EditQuestionPage] Error:", err);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherQuestionEditor
        subjects={subjects}
        existingQuestions={existingQuestions}
        initialQuestion={question}
      />
    </AppShell>
  );
}
