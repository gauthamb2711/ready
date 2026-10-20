"use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import type { Profile, UserRoleRecord } from "@/types/database.types";
import { X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile | null;
  roles?: UserRoleRecord[];
}

export function AppShell({ children, profile, roles = [] }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Desktop Sidebar */}
      <Sidebar profile={profile} roles={roles} />

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800 p-4 flex flex-col z-50">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-extrabold tracking-tight text-white text-lg">READY</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              {/* Reuse sidebar contents */}
              <Sidebar profile={profile} roles={roles} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64">
        <TopNav
          profile={profile}
          roles={roles}
          onMobileMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
