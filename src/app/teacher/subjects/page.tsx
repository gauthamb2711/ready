import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherSubjectsView } from "@/components/teacher/TeacherSubjectsView";
import { UnauthorizedState } from "@/components/ui/states";
import { getTeacherSubjects } from "@/lib/services/teacher.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Subjects | Teacher Ecosystem | READY",
  description: "Curriculum and subject management for faculty.",
};

export default async function TeacherSubjectsPage() {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/subjects");
  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Teacher Subjects"
          description={access.reason || "You do not have authorization to access the Teacher Subjects workspace."}
          backUrl="/teacher"
        />
      </AppShell>
    );
  }

  let subjects: any[] = [];
  if (profile) {
    try {
      subjects = await getTeacherSubjects(profile.id);
    } catch (err) {
      console.error("[TeacherSubjectsPage] Error loading subjects:", err);
    }
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherSubjectsView
        initialSubjects={subjects}
        isVerified={access.isPrivilegedVerified}
      />
    </AppShell>
  );
}
