import { NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { RetentionService } from "@/lib/services/retention.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await validateEcosystemAccess("STUDENT", "/api/student/retention");
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const dashboard = await RetentionService.getRetentionDashboard(userId);
    return NextResponse.json(dashboard);
  } catch (error: any) {
    console.error("Failed to load retention dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error loading retention dashboard." },
      { status: 500 }
    );
  }
}
