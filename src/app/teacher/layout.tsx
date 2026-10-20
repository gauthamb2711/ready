import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnauthorizedState } from "@/components/ui/states";
import { checkIsPlatformAdmin } from "@/lib/services/organization.service";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/teacher/dashboard");
  }

  // Fetch roles and profile
  const [{ data: profile }, { data: userRoles }, isPlatformAdmin] = await Promise.all([
    (supabase.from("profiles") as any).select("account_type, account_state").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    checkIsPlatformAdmin(supabase, user.id),
  ]);

  const hasTeacherRole =
    isPlatformAdmin ||
    (profile as any)?.account_type === "TEACHER" ||
    (userRoles as any[])?.some((r: any) =>
      ["TEACHER", "INSTRUCTOR"].includes(r.role)
    );

  if (!hasTeacherRole) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <UnauthorizedState
          title="Access Restricted: Teacher Workspace"
          description="Your account is not authorized to access the Teacher / Faculty workspace. Teacher credentials or ecosystem role are required."
          backUrl="/student/dashboard"
        />
      </div>
    );
  }

  return <>{children}</>;
}
