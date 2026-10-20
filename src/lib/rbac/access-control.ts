import type { AccountState, AccountType, Profile, SystemRole, UserRoleRecord } from "@/types/database.types";
import { PERMISSIONS, ROLE_PERMISSIONS_MAP, type PermissionCode } from "./permissions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export interface AuthorizationContext {
  userId: string;
  profile: Profile | null;
  roles: UserRoleRecord[];
  organizationId?: string | null;
}

/**
 * Core Authorization Decision Result
 */
export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  requiredPermission?: PermissionCode;
  checkedRole?: SystemRole;
}

/**
 * Retrieve the current authenticated user's full authorization context securely on the server.
 * Never trust client headers or client cookies for role claims.
 */
export async function getServerAuthContext(): Promise<AuthorizationContext | null> {
  try {
    const supabase = await createClient();
    let authUser = null;
    const {
      data: { user: cookieUser },
      error: userError,
    } = await supabase.auth.getUser();

    authUser = cookieUser;

    if (!authUser) {
      try {
        const headerList = await headers();
        const authHeader = headerList.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7).trim();
          if (token) {
            const { data: tokenUser, error: tokenError } = await supabase.auth.getUser(token);
            if (!tokenError && tokenUser?.user) {
              authUser = tokenUser.user;
            }
          }
        }
      } catch {
        // Ignored
      }
    }

    if (!authUser) {
      return null;
    }

    const user = authUser;

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    let profileRecord = (profile || null) as unknown as Profile | null;

    // Self-healing: If an authenticated auth.users record exists but public.profiles is missing,
    // synchronize and ensure the parent profile record exists in public.profiles.
    if (!profileRecord && user) {
      profileRecord = await ensureUserProfileRecord(supabase, user);
    }

    // Fetch active roles from user_roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id);

    const roles: UserRoleRecord[] = ((rolesData || []) as unknown as UserRoleRecord[]).slice();

    // Fetch active organization memberships so institutional teachers/admins have their org-scoped roles
    try {
      const { data: orgMembersData } = await (supabase.from("organization_members") as any)
        .select("id, organization_id, role, status")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE");

      if (orgMembersData && orgMembersData.length > 0) {
        for (const m of orgMembersData) {
          if (!roles.some((r) => r.role === m.role && r.organization_id === m.organization_id)) {
            roles.push({
              id: m.id || `org-role-${m.organization_id}-${user.id}`,
              user_id: user.id,
              role: m.role as SystemRole,
              organization_id: m.organization_id,
              assigned_at: new Date().toISOString(),
              assigned_by: null,
            });
          }
        }
      }
    } catch {
      // Non-blocking if table is temporarily inaccessible
    }

    // Role-Profile synchronization: If profile indicates an ecosystem role (e.g. TEACHER, STUDENT)
    // and user_roles is missing that base role, include it so the teacher is authorized
    if (profileRecord?.account_type) {
      const targetRole: SystemRole =
        profileRecord.account_type === "TEACHER"
          ? "TEACHER"
          : profileRecord.account_type === "COLLEGE_UNIVERSITY"
          ? "COLLEGE_ADMIN"
          : profileRecord.account_type === "COMPANY"
          ? "COMPANY_ADMIN"
          : profileRecord.account_type === "CANDIDATE"
          ? "CANDIDATE"
          : profileRecord.account_type === "PROFESSIONAL"
          ? "PROFESSIONAL"
          : "STUDENT";

      if (!roles.some((r) => r.role === targetRole)) {
        roles.push({
          id: `profile-sync-${targetRole}-${user.id}`,
          user_id: user.id,
          role: targetRole,
          organization_id: null,
          assigned_at: new Date().toISOString(),
          assigned_by: null,
        });

        // Persist to user_roles table idempotently so subsequent direct DB queries have it
        try {
          await (supabase.from("user_roles") as any).upsert(
            { user_id: user.id, role: targetRole },
            { onConflict: "user_id,role" }
          );
        } catch {
          // Non-blocking
        }
      }
    }

    return {
      userId: user.id,
      profile: profileRecord,
      roles,
      organizationId: roles.find((r) => r.organization_id)?.organization_id || null,
    };
  } catch (err) {
    console.error("[RBAC] Failed to resolve auth context:", err);
    return null;
  }
}

/**
 * Self-healing profile synchronization: Guarantees that an authenticated auth.users record
 * has a corresponding parent record in public.profiles and an initial user_role record.
 */
async function ensureUserProfileRecord(
  supabase: any,
  user: any
): Promise<Profile | null> {
  try {
    // 1. Attempt database RPC first if available
    try {
      const { data: rpcProfile, error: rpcError } = await supabase.rpc(
        "ensure_current_user_profile"
      );
      if (!rpcError && rpcProfile) {
        return rpcProfile as Profile;
      }
    } catch {
      // RPC might not exist yet if migration pending; fall through to direct upsert
    }

    // 2. Direct resilient upsert into public.profiles
    const rawType = user.user_metadata?.account_type;
    const accountType: AccountType = [
      "STUDENT",
      "CANDIDATE",
      "PROFESSIONAL",
      "TEACHER",
      "COLLEGE_UNIVERSITY",
      "COMPANY",
    ].includes(rawType)
      ? rawType
      : "STUDENT";

    const firstName = user.user_metadata?.first_name?.trim() || "";
    const lastName = user.user_metadata?.last_name?.trim() || "";
    const displayName =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName ||
          (user.email ? user.email.split("@")[0] : "Learner");

    const initialState: AccountState = [
      "TEACHER",
      "COLLEGE_UNIVERSITY",
      "COMPANY",
    ].includes(accountType)
      ? "PENDING"
      : "ACTIVE";

    const newProfile = {
      id: user.id,
      email: user.email ? user.email.trim().toLowerCase() : "",
      first_name: firstName || null,
      last_name: lastName || null,
      display_name: displayName,
      account_type: accountType,
      account_state: initialState,
      country_code: "US",
      locale: "en-US",
      timezone: "UTC",
      metadata: user.user_metadata || {},
    };

    const { data: inserted, error: insertError } = await (
      supabase.from("profiles") as any
    )
      .upsert(newProfile, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("[RBAC] Failed to self-heal profile in public.profiles:", insertError);
      return null;
    }

    // Also ensure initial user_roles entry with proper ecosystem mapping (never PLATFORM_ADMIN)
    const initialRole: SystemRole =
      accountType === "TEACHER"
        ? "TEACHER"
        : accountType === "COLLEGE_UNIVERSITY"
        ? "COLLEGE_ADMIN"
        : accountType === "COMPANY"
        ? "COMPANY_ADMIN"
        : accountType === "CANDIDATE"
        ? "CANDIDATE"
        : accountType === "PROFESSIONAL"
        ? "PROFESSIONAL"
        : "STUDENT";

    const { error: roleError } = await (supabase.from("user_roles") as any)
      .upsert(
        {
          user_id: user.id,
          role: initialRole,
        },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      console.warn("[RBAC] Failed to ensure initial user_roles:", roleError.message);
    }

    return inserted as Profile;
  } catch (err) {
    console.error("[RBAC] Error in ensureUserProfileRecord:", err);
    return null;
  }
}

/**
 * Deny-by-default role and permission evaluator:
 * AUTHENTICATION -> IDENTITY -> ROLE -> ORGANIZATION -> PERMISSION -> RESOURCE OWNERSHIP -> STATUS -> ALLOW/DENY
 */
export function evaluatePermission(
  ctx: AuthorizationContext | null,
  permission: PermissionCode,
  options?: {
    organizationId?: string | null;
    resourceOwnerId?: string | null;
    requireActiveState?: boolean;
  }
): AuthorizationDecision {
  // 1. Must be authenticated
  if (!ctx || !ctx.userId) {
    return { allowed: false, reason: "Unauthenticated: User identity not verified." };
  }

  // 2. Check Account Status (Reject if suspended/revoked/rejected)
  const accountState = ctx.profile?.account_state ?? "PENDING";
  if (accountState === "SUSPENDED" || accountState === "REVOKED" || accountState === "REJECTED") {
    return {
      allowed: false,
      reason: `Access Denied: Account state is ${accountState}.`,
    };
  }

  if (options?.requireActiveState && accountState === "PENDING") {
    return {
      allowed: false,
      reason: "Access Denied: Account verification pending approval by platform or organization.",
    };
  }

  // 3. Platform Admins have superadmin override (unless student private notes)
  const isPlatformAdmin = ctx.roles.some((r) => r.role === "PLATFORM_ADMIN" || r.role === "SECURITY_ADMIN");
  if (isPlatformAdmin && permission !== PERMISSIONS.LEARNING_NOTES_PRIVATE) {
    return { allowed: true, reason: "Allowed: Platform Admin Override" };
  }

  // 4. Student Private Data STRICT OWNERSHIP RULE: Private by default!
  if (permission === PERMISSIONS.LEARNING_NOTES_PRIVATE) {
    if (options?.resourceOwnerId && options.resourceOwnerId !== ctx.userId) {
      return {
        allowed: false,
        reason: "Access Denied: Student private notes are strictly restricted to the owner.",
      };
    }
  }

  // 5. Multi-tenant Organization Boundary Check
  if (options?.organizationId) {
    const hasOrgAccess = ctx.roles.some((r) => r.organization_id === options.organizationId);
    if (!hasOrgAccess && !isPlatformAdmin) {
      return {
        allowed: false,
        reason: "Access Denied: User is not authorized for this tenant organization.",
      };
    }
  }

  // 6. Role & Permission Matrix Check
  const effectiveRoles = new Set<string>(ctx.roles.map((r) => r.role));

  // Synthesize from profile account_type if profile exists and account is not suspended/rejected/revoked
  if (ctx.profile?.account_type) {
    if (ctx.profile.account_type === "TEACHER") effectiveRoles.add("TEACHER");
    else if (ctx.profile.account_type === "COLLEGE_UNIVERSITY") effectiveRoles.add("COLLEGE_ADMIN");
    else if (ctx.profile.account_type === "COMPANY") effectiveRoles.add("COMPANY_ADMIN");
    else if (ctx.profile.account_type === "STUDENT") effectiveRoles.add("STUDENT");
    else if (ctx.profile.account_type === "CANDIDATE") effectiveRoles.add("CANDIDATE");
    else if (ctx.profile.account_type === "PROFESSIONAL") effectiveRoles.add("PROFESSIONAL");
  }

  const hasPermission = Array.from(effectiveRoles).some((role) => {
    const rolePermissions = ROLE_PERMISSIONS_MAP[role] || [];
    return rolePermissions.includes(permission);
  });

  if (!hasPermission) {
    return {
      allowed: false,
      reason: `Access Denied: Missing required permission [${permission}].`,
      requiredPermission: permission,
    };
  }

  return { allowed: true };
}

/**
 * Ecosystem route access verification
 * Enforces that selecting an ecosystem is strictly governed by verified roles,
 * NOT simply user choice in the frontend!
 */
export function isAuthorizedForEcosystemRoute(
  accountType: AccountType | undefined,
  roles: UserRoleRecord[],
  targetEcosystem: AccountType
): boolean {
  if (!roles || roles.length === 0) return false;

  // Platform Admins can inspect all ecosystems
  if (roles.some((r) => r.role === "PLATFORM_ADMIN" || r.role === "SUPPORT_ADMIN")) {
    return true;
  }

  switch (targetEcosystem) {
    case "STUDENT":
      return roles.some((r) => r.role === "STUDENT");
    case "CANDIDATE":
      return roles.some((r) => r.role === "CANDIDATE" || r.role === "STUDENT");
    case "PROFESSIONAL":
      return roles.some((r) => r.role === "PROFESSIONAL");
    case "TEACHER":
      return roles.some((r) => r.role === "TEACHER" || r.role === "INSTRUCTOR");
    case "COLLEGE_UNIVERSITY":
      return roles.some((r) =>
        ["COLLEGE_ADMIN", "DEPARTMENT_ADMIN", "EXAM_ADMIN"].includes(r.role)
      );
    case "COMPANY":
      return roles.some((r) =>
        ["COMPANY_ADMIN", "RECRUITER", "TRAINING_MANAGER", "ASSESSMENT_MANAGER"].includes(r.role)
      );
    default:
      return false;
  }
}

export interface EcosystemAccessResult {
  authorized: boolean;
  reason?: string;
  isPrivilegedVerified: boolean;
  authContext: AuthorizationContext;
}

/**
 * Validates ecosystem access server-side.
 * Rejects suspended/revoked/rejected accounts, enforces ecosystem association,
 * and identifies privileged verification status.
 */
export async function validateEcosystemAccess(
  targetEcosystem: AccountType,
  redirectPath: string
): Promise<EcosystemAccessResult> {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectPath)}`);
  }

  // Profile existence check - fail closed if profile cannot be resolved
  if (!authContext.profile) {
    return {
      authorized: false,
      reason: "Your user profile could not be synchronized. Please log in again to initialize your account.",
      isPrivilegedVerified: false,
      authContext,
    };
  }

  const accountState = authContext.profile.account_state;

  // Account state check - fail closed
  if (accountState === "SUSPENDED" || accountState === "REVOKED" || accountState === "REJECTED") {
    redirect(`/account-status?state=${accountState}`);
  }

  const requestedEco = authContext.profile.account_type;
  const userRoles = authContext.roles;

  // Platform admins can access all ecosystems
  const isPlatformAdmin = userRoles.some((r) => r.role === "PLATFORM_ADMIN" || r.role === "SUPPORT_ADMIN");
  if (isPlatformAdmin) {
    return { authorized: true, isPrivilegedVerified: true, authContext };
  }

  // Check if user is associated with this ecosystem
  const isRequestedEcosystem = requestedEco === targetEcosystem;
  const hasEcosystemRole = isAuthorizedForEcosystemRoute(requestedEco, userRoles, targetEcosystem);

  if (!isRequestedEcosystem && !hasEcosystemRole) {
    return {
      authorized: false,
      reason: `Your account (${requestedEco}) is not authorized to access the ${targetEcosystem} workspace.`,
      isPrivilegedVerified: false,
      authContext,
    };
  }

  // Check if privileged ecosystem has verified role
  let isPrivilegedVerified = false;
  if (targetEcosystem === "TEACHER") {
    isPrivilegedVerified =
      userRoles.some((r) => r.role === "TEACHER" || r.role === "INSTRUCTOR") &&
      (accountState === "ACTIVE" || accountState === "VERIFIED");
  } else if (targetEcosystem === "COLLEGE_UNIVERSITY") {
    isPrivilegedVerified =
      userRoles.some((r) => ["COLLEGE_ADMIN", "DEPARTMENT_ADMIN", "EXAM_ADMIN"].includes(r.role)) &&
      (accountState === "ACTIVE" || accountState === "VERIFIED");
  } else if (targetEcosystem === "COMPANY") {
    isPrivilegedVerified =
      userRoles.some((r) =>
        ["COMPANY_ADMIN", "RECRUITER", "TRAINING_MANAGER", "ASSESSMENT_MANAGER"].includes(r.role)
      ) &&
      (accountState === "ACTIVE" || accountState === "VERIFIED");
  } else {
    isPrivilegedVerified = accountState === "ACTIVE" || accountState === "VERIFIED";
  }

  return {
    authorized: true,
    isPrivilegedVerified,
    authContext,
  };
}
