import { Suspense } from "react";
import Link from "next/link";
import { ShieldAlert, AlertOctagon, Clock, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account Status | READY",
  description: "Account state review and verification status notice.",
};

function StatusContent({ state }: { state?: string }) {
  const currentState = (state || "PENDING").toUpperCase();

  const config = {
    PENDING: {
      title: "Verification Awaiting Approval",
      desc: "Your account request is currently awaiting institutional verification. Privileged organization features will become available once your affiliation is approved.",
      badge: "Pending Verification",
      variant: "warning" as const,
      icon: Clock,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    REJECTED: {
      title: "Verification Request Not Approved",
      desc: "Your verification request was not approved by the organization administrator or platform security. Please verify your credentials or apply with a recognized institutional email.",
      badge: "Request Rejected",
      variant: "destructive" as const,
      icon: XCircle,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
    },
    SUSPENDED: {
      title: "Account Temporarily Restricted",
      desc: "Your account is temporarily restricted due to security or compliance policy review. Access to assessment features and organizational records is currently on hold.",
      badge: "Account Suspended",
      variant: "destructive" as const,
      icon: AlertOctagon,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
    },
    REVOKED: {
      title: "Access Revoked",
      desc: "Your access has been revoked. You no longer have authorization to access resources or workspaces within the READY platform.",
      badge: "Access Revoked",
      variant: "destructive" as const,
      icon: ShieldAlert,
      color: "text-red-500 bg-red-950/40 border-red-800",
    },
    ACTIVE: {
      title: "Account Active",
      desc: "Your account is active. You may proceed to your authorized ecosystem workspace.",
      badge: "Active",
      variant: "success" as const,
      icon: Clock,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    VERIFIED: {
      title: "Account Verified",
      desc: "Your credentials and organizational affiliation are fully verified.",
      badge: "Verified",
      variant: "default" as const,
      icon: Clock,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
  }[currentState] || {
    title: "Account Status Notice",
    desc: "Your account status is currently under review.",
    badge: "Review",
    variant: "warning" as const,
    icon: Clock,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  const Icon = config.icon;

  return (
    <Card className="max-w-lg w-full border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
      <CardHeader className="text-center pb-4">
        <div className={`mx-auto h-16 w-16 rounded-2xl border flex items-center justify-center mb-3 ${config.color}`}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="flex justify-center mb-1">
          <Badge variant={config.variant}>{config.badge}</Badge>
        </div>
        <CardTitle className="text-2xl font-bold text-white">{config.title}</CardTitle>
        <CardDescription className="text-slate-300 text-xs mt-2 leading-relaxed">
          {config.desc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300 mb-1">Security & Policy Notice</div>
          <p>
            In compliance with READY&apos;s deny-by-default architecture, non-active account states fail-closed. No organizational data or assessment questions can be retrieved while in this state.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center gap-3 pt-2">
        <Link href="/login">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Login</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default async function AccountStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-mesh-radial">
      <Suspense fallback={<div className="text-sm text-slate-400">Loading status...</div>}>
        <StatusContent state={params.state} />
      </Suspense>
    </div>
  );
}
