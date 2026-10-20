import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherQuestionReviewView } from "@/components/teacher/TeacherQuestionReviewView";
import { UnauthorizedState } from "@/components/ui/states";
import {
  getQuestionAuditLogs,
  getTeacherQuestionDetails,
  getTeacherSubjectDetails,
} from "@/lib/services/teacher.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Question Detail & Lifecycle | Teacher Ecosystem | READY",
  description: "Question lifecycle approval, quality evaluation, and audit history.",
};

export default async function TeacherQuestionDetailPage({
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
          title="Access Restricted: Question Review"
          description={access.reason || "You do not have authorization to view this question."}
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

  const [subject, auditLogs] = await Promise.all([
    getTeacherSubjectDetails(profile.id, question.subject_id),
    getQuestionAuditLogs(questionId),
  ]);

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherQuestionReviewView
        question={question}
        subject={subject}
        isVerified={access.isPrivilegedVerified}
        auditLogs={auditLogs}
      />
    </AppShell>
  );
}
