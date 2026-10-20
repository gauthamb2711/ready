import { createClient } from "@/lib/supabase/server";
import { checkIsPlatformAdmin } from "@/lib/services/organization.service";
import { redirect } from "next/navigation";
import { UnauthorizedState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin/overview");
  }

  const isPlatformAdmin = await checkIsPlatformAdmin(supabase, user.id);

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <UnauthorizedState
          title="Access Restricted: Platform Administration"
          description="Only authorized READY Platform Administrators can access this area. Your account does not have platform administrative privileges."
          backUrl="/student/dashboard"
        />
      </div>
    );
  }

  return <>{children}</>;
}
