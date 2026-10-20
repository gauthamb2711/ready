import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, UnauthorizedState } from "@/components/ui/states";
import { Award, Briefcase, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import { ACCOUNT_STATES } from "@/lib/rbac/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Professional Ecosystem | READY",
  description: "Targeted skill upgrades, professional credentials, and retention tracking.",
};

export default async function ProfessionalDashboardPage() {
  const access = await validateEcosystemAccess("PROFESSIONAL", "/professional");

  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Professional Ecosystem"
          description={access.reason || "You do not have authorization to access the Professional workspace."}
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
              <h1 className="text-2xl font-bold tracking-tight text-white">Professional Ecosystem</h1>
              <Badge variant="default">Career Upskilling</Badge>
              <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Benchmark current industry skills, eliminate capability gaps, and maintain verified certification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" className="gap-2">
              <Zap className="h-4 w-4" />
              <span>Skill Benchmark</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Verified Competencies</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-white">0 Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Verified through standardized assessment</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Capability Upgrade Target</span>
                <Briefcase className="h-4 w-4 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-white">Senior Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Domain target profile</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Skill Retention Index</span>
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              <CardTitle className="text-2xl text-white">98%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Retention degradation monitoring</p>
            </CardContent>
          </Card>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-400" />
                <span>Active Upskilling Pathways</span>
              </CardTitle>
              <CardDescription>
                Micro-plans targeting identified professional competency gaps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No active upskilling plans"
                description="Select target skills from your industry profile to start micro-action learning."
                actionLabel="Define Target Skills"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" />
                <span>Verified Credentials & Certificates</span>
              </CardTitle>
              <CardDescription>
                Cryptographically verifiable skill badges and proof of retention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No certificates issued"
                description="Complete rigorous assessments to earn verified capability certificates."
                actionLabel="Take Verification Exam"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
