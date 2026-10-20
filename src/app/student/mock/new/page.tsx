import Link from "next/link";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, EmptyState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";
import { MockConfigurator } from "@/components/student/MockConfigurator";
import { PlusCircle } from "lucide-react";
import type { StudentSubject } from "@/types/database.types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Mock Exam | READY",
  description: "Configure subject, difficulty, duration, and question distribution for a mock exam simulation.",
};

export default async function NewMockPage() {
  const access = await validateEcosystemAccess("STUDENT", "/student/mock/new");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Mock Engine"
          description={access.reason || "You must be an authenticated student to configure mock exams."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  const supabase = await createClient();
  const { data: subjects } = await (supabase.from("student_subjects") as any)
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  const subjectList: StudentSubject[] = subjects || [];

  if (subjectList.length === 0) {
    return (
      <AppShell profile={profile} roles={roles}>
        <div className="p-8 max-w-4xl mx-auto">
          <EmptyState
            title="No Subjects Enrolled"
            description="You need to enroll in a subject before generating a mock exam simulation."
            action={
              <Link
                href="/student/subjects"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Your First Subject</span>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <MockConfigurator subjects={subjectList} />
    </AppShell>
  );
}
