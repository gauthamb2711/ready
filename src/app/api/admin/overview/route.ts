import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  getPlatformGlobalAnalytics,
  getPlatformOrganizationsForReview,
} from "@/lib/services/organization.service";

export async function GET() {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getPlatformGlobalAnalytics(authContext.userId);
    const orgsResult = await getPlatformOrganizationsForReview(authContext.userId);

    if (!result.success) {
      const isForbidden = result.error?.includes("Forbidden");
      return NextResponse.json({ error: result.error }, { status: isForbidden ? 403 : 500 });
    }

    return NextResponse.json({
      success: true,
      analytics: result.analytics,
      organizations: orgsResult.organizations || [],
    });
  } catch (err: any) {
    console.error("[PlatformAdminOverviewAPI] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
