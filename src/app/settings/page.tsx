import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ACCOUNT_STATES, ACCOUNT_TYPES } from "@/lib/rbac/roles";
import { SUPPORTED_COUNTRIES, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { Shield, Key, Globe, UserCheck, Smartphone } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings & Verification | READY",
  description: "Account preferences, role assignments, security, and global localization.",
};

export default async function SettingsPage() {
  const authContext = await getServerAuthContext();

  if (!authContext) {
    redirect("/login?redirectTo=/settings");
  }

  const { profile, roles, userId } = authContext;
  const accountType = profile?.account_type || "STUDENT";
  const accountState = profile?.account_state || "PENDING";
  const stateMeta = ACCOUNT_STATES[accountState];
  const ecoMeta = ACCOUNT_TYPES[accountType];

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform & Account Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your account identity, security posture, and global localization settings.
          </p>
        </div>

        {/* Identity & Account State */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-400" />
                  <span>Account Identity & Ecosystem State</span>
                </CardTitle>
                <CardDescription>
                  Your current verification status within the READY platform.
                </CardDescription>
              </div>
              <Badge variant={stateMeta.variant} className="text-xs">
                {stateMeta.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                <div className="text-sm font-mono text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {profile?.email}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Authenticated User ID</label>
                <div className="text-sm font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 truncate">
                  {userId}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Requested Ecosystem</label>
                <div className="text-sm text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {ecoMeta.label}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Active Database Roles</label>
                <div className="text-sm font-mono text-indigo-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {roles.length > 0 ? roles.map((r) => r.role).join(", ") : "Default Learner"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Localization & Internationalization Readiness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-400" />
              <span>Global Preferences & Localization</span>
            </CardTitle>
            <CardDescription>
              Multi-region support: timezones, currencies, and grading system conventions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                id="country-select"
                label="Country / Region"
                defaultValue={profile?.country_code || "US"}
              >
                {Object.values(SUPPORTED_COUNTRIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.defaultCurrency})
                  </option>
                ))}
              </Select>

              <Select
                id="locale-select"
                label="Language / Locale"
                defaultValue={profile?.locale || "en-US"}
              >
                {SUPPORTED_LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>

              <Input
                id="timezone-input"
                label="Timezone"
                defaultValue={profile?.timezone || "UTC"}
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Access Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Security & Access Controls</span>
            </CardTitle>
            <CardDescription>
              Backend-enforced Row Level Security and session persistence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="text-xs font-medium text-white">PostgreSQL Row-Level Security</div>
                  <div className="text-[11px] text-slate-400">Strict deny-by-default tenant policies active</div>
                </div>
              </div>
              <Badge variant="success">Enforced</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="text-xs font-medium text-white">Session Persistence & JWT Cookies</div>
                  <div className="text-[11px] text-slate-400">HTTP-only cookie exchange via Next.js SSR middleware</div>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
