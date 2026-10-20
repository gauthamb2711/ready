import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/student/dashboard");
  }

  const { data: profile } = await (supabase
    .from("profiles") as any)
    .select("account_state, metadata")
    .eq("id", user.id)
    .maybeSingle();

  const accountState = (profile as any)?.account_state || "ACTIVE";
  if (accountState === "SUSPENDED" || accountState === "REVOKED" || accountState === "REJECTED") {
    redirect(`/account-status?state=${accountState}`);
  }

  return <>{children}</>;
}
