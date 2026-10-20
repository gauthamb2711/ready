import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, UnauthorizedState } from "@/components/ui/states";
import { Building, Users, Search, Award, ShieldAlert, Plus } from "lucide-react";
import { ACCOUNT_STATES } from "@/lib/rbac/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Company / Organization Ecosystem | READY",
  description: "Workforce upskilling, talent pipeline assessment, and verified hire evaluation.",
};

export default async function CompanyDashboardPage() {
  const access = await validateEcosystemAccess("COMPANY", "/company");

  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Company / Organization Ecosystem"
          description={access.reason || "You do not have authorization to access the Company / Organization workspace."}
          backUrl="/"
        />
      </AppShell>
    );
  }

  const isCompanyAdmin = access.isPrivilegedVerified;
  const accountState = profile?.account_state || "PENDING";
  const stateMeta = ACCOUNT_STATES[accountState];

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Company / Organization Ecosystem</h1>
              <Badge variant="default">Enterprise Tenant</Badge>
              <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Workforce upskilling pipelines, hiring benchmarks, and verified capability candidate discovery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" className="gap-2" disabled={!isCompanyAdmin}>
              <Plus className="h-4 w-4" />
              <span>Create Hiring Pipeline</span>
            </Button>
          </div>
        </div>

        {/* Admin status notice */}
        {!isCompanyAdmin && (
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-amber-300">
                  Enterprise Admin Access Pending Verification
                </h4>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Selecting Company upon signup indicates your organization affiliation. Unlocking recruiter candidate searches and internal workforce capability matrices requires corporate domain verification.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tenant Boundary Indicator */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-600/15 text-indigo-400">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Enterprise Multi-Tenant Boundary: Active</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tenant Isolation: Company A cannot access Company B talent pools or workforce capability records.
                </div>
              </div>
            </div>
            <Badge variant="outline">Strict Tenant RLS</Badge>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Workforce Members</span>
                <Users className="h-4 w-4 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-white">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Active employees enrolled in upskilling</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Active Hiring Benchmarks</span>
                <Search className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-white">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Role capability standards</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Verified Candidate Pool</span>
                <Award className="h-4 w-4 text-amber-400" />
              </div>
              <CardTitle className="text-2xl text-white">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Verified benchmarked applicants</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Workforce Skill Retention</span>
                <Building className="h-4 w-4 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-white">-- %</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Capability decay & training impact</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty States */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workforce Competency Matrix</CardTitle>
              <CardDescription>
                Map company job roles to target capabilities and track retention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No internal teams configured"
                description="Import your engineering, operations, or product teams to start capability tracking."
                actionLabel="Configure Teams"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verified Candidate Pipeline</CardTitle>
              <CardDescription>
                View candidates with pre-verified skill proof from standardized assessments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No active pipeline"
                description="Post a verified assessment benchmark to receive pre-evaluated candidates."
                actionLabel="Create Benchmark"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
