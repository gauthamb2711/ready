import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onboarding & Ecosystem Verification | READY",
  description: "Account state setup, ecosystem selection, and institutional verification review.",
};

export default async function OnboardingPage() {
  const authContext = await getServerAuthContext();

  if (!authContext) {
    redirect("/login?redirectTo=/onboarding");
  }

  const { profile, roles } = authContext;

  // If for some reason profile record is not yet loaded, fallback gracefully
  const safeProfile = profile || {
    id: authContext.userId,
    email: "",
    first_name: "",
    last_name: "",
    display_name: "Learner",
    account_type: "STUDENT",
    account_state: "ACTIVE",
    country_code: "US",
    locale: "en-US",
    timezone: "UTC",
    avatar_url: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="py-6">
        <OnboardingWizard initialProfile={safeProfile} roles={roles} />
      </div>
    </AppShell>
  );
}
