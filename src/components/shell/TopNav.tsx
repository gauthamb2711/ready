"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Shield, Globe } from "lucide-react";
import { UserMenu } from "./UserMenu";
import type { Profile, UserRoleRecord } from "@/types/database.types";
import { Dialog } from "@/components/ui/dialog";

interface TopNavProps {
  profile: Profile | null;
  roles?: UserRoleRecord[];
  onMobileMenuToggle?: () => void;
}

export function TopNav({ profile, roles = [], onMobileMenuToggle }: TopNavProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = React.useState(false);

  // Generate simple breadcrumb text
  const getPageTitle = () => {
    if (pathname.startsWith("/student")) return "Student Learning & Verification";
    if (pathname.startsWith("/teacher")) return "Teacher & Faculty Workspace";
    if (pathname.startsWith("/college")) return "College / University Institutional Tenant";
    if (pathname.startsWith("/admin")) return "Platform Administration & Analytics";
    if (pathname.startsWith("/professional")) return "Professional Skill Pipeline";
    if (pathname.startsWith("/candidate")) return "Candidate Assessment & Benchmarking";
    if (pathname.startsWith("/company")) return "Company & Enterprise Workforce";
    if (pathname.startsWith("/settings")) return "Platform & Account Settings";
    if (pathname.startsWith("/onboarding")) return "Ecosystem & Account Verification";
    return "READY SaaS Platform";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-xl md:px-8">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white md:hidden"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 hidden sm:inline">
            READY
          </Link>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <h1 className="text-sm font-semibold tracking-tight text-white">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Right: Notification, Global Indicator & User Menu */}
      <div className="flex items-center gap-3">
        {/* Global Multi-Region / i18n Readiness Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400">
          <Globe className="h-3.5 w-3.5 text-indigo-400" />
          <span>Multi-Tenant Global</span>
        </div>

        {/* Notifications Placeholder */}
        <button
          onClick={() => setShowNotifications(true)}
          className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-950" />
        </button>

        {/* User Profile Navigation */}
        <UserMenu profile={profile} roles={roles} />
      </div>

      {/* Notifications Dialog Placeholder */}
      <Dialog
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="System Notifications"
        description="Day 1 System Event & Security Log Stream"
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Shield className="h-3.5 w-3.5" />
                Security Verification Active
              </span>
              <span className="text-[10px] text-slate-400">Day 1</span>
            </div>
            <p className="mt-1 text-slate-400 text-[11px]">
              Supabase Row-Level Security and Deny-by-Default authorization policies are initialized and actively protecting all tenant boundaries.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Student Privacy Enforcement</span>
              <span className="text-[10px] text-slate-400">Active</span>
            </div>
            <p className="mt-1 text-slate-400 text-[11px]">
              Student private notes, learning sessions, and diagnostic responses are locked to the user ID and isolated from teachers and organizations.
            </p>
          </div>
        </div>
      </Dialog>
    </header>
  );
}
