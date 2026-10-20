import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherCurriculumBuilder } from "@/components/teacher/TeacherCurriculumBuilder";
import { UnauthorizedState } from "@/components/ui/states";
import { getCurriculumTree, getTeacherSubjectDetails } from "@/lib/services/teacher.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Curriculum Builder | Teacher Ecosystem | READY",
  description: "Hierarchical curriculum and learning objective builder.",
};

export default async function TeacherSubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/subjects");
  const { profile, roles } = access.authContext;

  if (!access.authorized || !profile) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Curriculum Builder"
          description={access.reason || "You do not have authorization to view this curriculum."}
          backUrl="/teacher/subjects"
        />
      </AppShell>
    );
  }

  const { id: subjectId } = await params;
  const subject = await getTeacherSubjectDetails(profile.id, subjectId);

  if (!subject) {
    notFound();
  }

  const curriculum = await getCurriculumTree(profile.id, subjectId);

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherCurriculumBuilder
        subject={subject}
        initialCurriculum={curriculum}
        isVerified={access.isPrivilegedVerified}
      />
    </AppShell>
  );
}
