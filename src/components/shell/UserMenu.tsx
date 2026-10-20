"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";
import type { AccountState, AccountType, Profile, UserRoleRecord } from "@/types/database.types";
import { ACCOUNT_STATES } from "@/lib/rbac/roles";

interface UserMenuProps {
  profile: Profile | null;
  roles?: UserRoleRecord[];
}

export function UserMenu({ profile, roles = [] }: UserMenuProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Authorized User";
  const email = profile?.email || "";
  const accountType = profile?.account_type || "STUDENT";
  const accountState = (profile?.account_state || "PENDING") as AccountState;
  const stateBadge = ACCOUNT_STATES[accountState] || ACCOUNT_STATES.PENDING;

  return (
    <Dropdown
      align="right"
      trigger={
        <button
          id="user-profile-menu-btn"
          className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 transition-colors hover:border-slate-700 hover:bg-slate-800/80 focus:outline-none"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-xs font-semibold text-white uppercase shadow-sm">
            {displayName.slice(0, 2)}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-xs font-medium text-slate-200 line-clamp-1">{displayName}</div>
            <div className="text-[10px] text-slate-400 capitalize">{accountType.toLowerCase().replace("_", " ")}</div>
          </div>
        </button>
      }
    >
      <div className="border-b border-slate-800 px-3 py-2.5">
        <p className="text-xs font-semibold text-white">{displayName}</p>
        <p className="text-[11px] text-slate-400 truncate">{email}</p>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant={stateBadge.variant}>{stateBadge.label}</Badge>
          <span className="text-[10px] text-slate-400 uppercase font-mono">
            {roles?.[0]?.role || accountType}
          </span>
        </div>
      </div>

      <div className="py-1">
        <DropdownItem onClick={() => router.push("/settings")}>
          <Settings className="h-3.5 w-3.5 text-slate-400" />
          <span>Account Settings</span>
        </DropdownItem>
      </div>

      <div className="border-t border-slate-800 py-1">
        <DropdownItem onClick={handleLogout} destructive>
          <LogOut className="h-3.5 w-3.5" />
          <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
        </DropdownItem>
      </div>
    </Dropdown>
  );
}
