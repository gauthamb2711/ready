import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, UnauthorizedState } from "@/components/ui/states";
import { Building2, Users, GraduationCap, ShieldAlert, Plus, Layers, ArrowRight, CheckCircle2, UserCheck } from "lucide-react";
import { ACCOUNT_STATES } from "@/lib/rbac/roles";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "College / University Ecosystem | READY",
  description: "Institutional multi-tenant management, department programs, and outcome analytics.",
};

export default async function CollegeDashboardPage() {
  const access = await validateEcosystemAccess("COLLEGE_UNIVERSITY", "/college");
  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: College / University Ecosystem"
          description={access.reason || "You do not have authorization to access the College / University workspace."}
          backUrl="/"
        />
      </AppShell>
    );
  }

  const isCollegeAdmin = access.isPrivilegedVerified;
  const accountState = profile?.account_state || "PENDING";
  const stateMeta = ACCOUNT_STATES[accountState];

  const supabase = await createClient();

  // Find organization administered by this user
  let targetOrgId: string | null = null;
  let organization: any = null;

  // 1. Check organization_members
  const { data: memberRecord } = await supabase
    .from("organization_members")
    .select("organization_id, role, status")
    .eq("user_id", profile?.id || "")
    .in("role", ["COLLEGE_ADMIN", "ORGANIZATION_OWNER", "DEPARTMENT_ADMIN", "HOD"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberRecord) {
    targetOrgId = (memberRecord as any).organization_id;
  } else {
    // 2. Check if created_by this user
    const { data: createdOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("created_by", profile?.id || "")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (createdOrg) {
      targetOrgId = (createdOrg as any).id;
    }
  }

  let activeFacultyCount = 0;
  let pendingRequestsCount = 0;
  let departmentsCount = 0;

  if (targetOrgId) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", targetOrgId)
      .maybeSingle();
    organization = orgData;

    // Active faculty count
    const { count: facCount } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", targetOrgId)
      .eq("role", "TEACHER")
      .eq("status", "ACTIVE");
    activeFacultyCount = facCount || 0;

    // Pending requests count
    const { count: reqCount } = await supabase
      .from("organization_membership_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", targetOrgId)
      .eq("status", "PENDING");
    pendingRequestsCount = reqCount || 0;

    // Departments count
    const { count: deptCount } = await supabase
      .from("organization_departments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", targetOrgId);
    departmentsCount = deptCount || 0;
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {organization ? organization.name : "College / University Ecosystem"}
              </h1>
              <Badge variant="default">Multi-Tenant Tenant</Badge>
              <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tenant institutional workspace. Isolated department programs, faculty rosters, and cohort capability retention.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/college/faculty">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-violet-500/30 text-violet-300 hover:bg-violet-950/40"
              >
                <Users className="h-4 w-4 text-violet-400" />
                <span>Faculty Management</span>
                {pendingRequestsCount > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-black text-[10px] px-1.5 py-0 font-bold">
                    {pendingRequestsCount} Pending
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/college/faculty">
              <Button variant="primary" size="sm" className="gap-2 bg-violet-600 hover:bg-violet-500 text-white">
                <Plus className="h-4 w-4" />
                <span>Add Department</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Prominent Pending Faculty Join Requests Banner */}
        {pendingRequestsCount > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Pending Faculty Requests ({pendingRequestsCount})
                </h4>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Teachers have requested affiliation with {organization?.name || "your institution"}. Review and approve their faculty membership to activate their institutional access.
                </p>
              </div>
            </div>
            <Link href="/college/faculty" className="shrink-0">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Review & Approve Faculty</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Multi-Tenant Security & Role Warning if pending verification */}
        {!isCollegeAdmin && (
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-amber-300">
                  Institutional Admin Privileges Pending Platform Review
                </h4>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Selecting College / University upon signup registers your institutional intent. Full administrative controls over departments, student records, and faculty invites require tenant domain verification by Platform Security.
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
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Institutional Multi-Tenant Boundary: Active</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tenant Isolation: College A cannot view or access College B student records, faculty rosters, or exam data.
                </div>
              </div>
            </div>
            <Badge variant="outline">RLS Scoped</Badge>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* FACULTY SUMMARY CARD (Prominently displayed) */}
          <Card className="glass-card border-slate-800 bg-slate-900/60 hover:border-violet-500/40 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold text-violet-400">Faculty</span>
                <Users className="h-4 w-4 text-violet-400" />
              </div>
              <CardTitle className="text-2xl text-white font-mono mt-1">
                {activeFacultyCount} <span className="text-xs font-normal text-slate-400">Active Faculty</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="text-xs">
                {pendingRequestsCount > 0 ? (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs">
                    {pendingRequestsCount} Pending {pendingRequestsCount === 1 ? "Request" : "Requests"}
                  </Badge>
                ) : (
                  <span className="text-slate-400">0 Pending Faculty Requests</span>
                )}
              </div>
              <Link href="/college/faculty" className="block pt-1">
                <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>Manage Faculty</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Departments</span>
                <Layers className="h-4 w-4 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-white font-mono">{departmentsCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Computer Science, Electronics, etc.</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Enrolled Students</span>
                <GraduationCap className="h-4 w-4 text-amber-400" />
              </div>
              <CardTitle className="text-2xl text-white font-mono">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Cohort members across batches</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase font-semibold">Institutional Status</span>
                <Building2 className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-xl text-white">
                {organization?.verification_status || "PENDING"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Verified by Platform Security</p>
            </CardContent>
          </Card>
        </div>

        {/* Section: Faculty and Department Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center justify-between">
                <span>Faculty Roster & Invitations</span>
                <Badge variant="outline" className="border-violet-500/30 text-violet-400 text-xs">
                  {activeFacultyCount} Active • {pendingRequestsCount} Pending
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Review and approve faculty applications, assign departmental scopes, and manage active teacher permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Pending Join Requests</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {pendingRequestsCount === 0
                      ? "No pending requests. All faculty applications reviewed."
                      : `${pendingRequestsCount} teacher request(s) awaiting your administrative approval.`}
                  </div>
                </div>
                <Link href="/college/faculty">
                  <Button size="sm" variant={pendingRequestsCount > 0 ? "primary" : "outline"} className="text-xs gap-1.5">
                    <span>Manage Faculty</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Active Institutional Faculty</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {activeFacultyCount} verified instructors authorized for institutional course authoring.
                  </div>
                </div>
                <Link href="/college/faculty">
                  <Button size="sm" variant="ghost" className="text-xs gap-1.5 text-slate-300 hover:text-white">
                    <span>View Roster</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base text-white">Academic Departments & Curricula</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Manage academic divisions, course codes, and department-level assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Configured Departments ({departmentsCount})</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Department structure maps faculty and course offerings to academic tracks.
                  </div>
                </div>
                <Link href="/college/faculty">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5 border-slate-700">
                    <Plus className="h-3 w-3" />
                    <span>Add Department</span>
                  </Button>
                </Link>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Multi-Tenant Isolation</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Tenant data boundaries are strictly enforced by Row Level Security.
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
