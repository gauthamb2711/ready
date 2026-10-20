import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, UnauthorizedState } from "@/components/ui/states";
import { Briefcase, CheckCircle, FileCheck, Search, Share2 } from "lucide-react";
import { ACCOUNT_STATES } from "@/lib/rbac/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Candidate Ecosystem | READY",
  description: "Standardized skill benchmarking, verified credentials, and hiring readiness.",
};

export default async function CandidateDashboardPage() {
  const access = await validateEcosystemAccess("CANDIDATE", "/candidate");

  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Candidate Ecosystem"
          description={access.reason || "You do not have authorization to access the Candidate workspace."}
          backUrl="/"
        />
      </AppShell>
    );
  }

  const accountState = profile?.account_state || "PENDING";
  const stateMeta = ACCOUNT_STATES[accountState];

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Candidate Ecosystem</h1>
              <Badge variant="default">Talent Benchmarking</Badge>
              <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Standardized assessments, verified capability profiles, and employer share links.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-3.5 w-3.5" />
              <span>Share Profile</span>
            </Button>
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Assessment Score Percentile</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-white">Top 15%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Based on standardized domain tests</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Verified Cap Badges</span>
                <FileCheck className="h-4 w-4 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-white">0 Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Tamper-proof capability credentials</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Recruiter Profile Visibility</span>
                <Search className="h-4 w-4 text-amber-400" />
              </div>
              <CardTitle className="text-2xl text-white">Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Control who can discover your scorecards</p>
            </CardContent>
          </Card>
        </div>

        {/* Candidate Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-400" />
                <span>Job Readiness Benchmarks</span>
              </CardTitle>
              <CardDescription>
                Role-based evaluations matching real-world engineering and product expectations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No active benchmark tests taken"
                description="Take a standardized benchmark test to showcase verified competence to companies."
                actionLabel="Browse Benchmarks"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-400" />
                <span>Assessment Submissions & Reports</span>
              </CardTitle>
              <CardDescription>
                Detailed breakdowns of speed, accuracy, and core problem-solving capability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No completed assessments yet"
                description="Your past assessment reports and verified capability scorecards will appear here."
                actionLabel="Schedule Assessment"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
