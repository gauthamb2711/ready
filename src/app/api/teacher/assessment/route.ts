import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export async function POST(request: Request) {
  try {
    const authContext = await getServerAuthContext();

    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Valid session required." },
        { status: 401 }
      );
    }

    // Evaluate permission with strict requirement for ACTIVE/VERIFIED state
    const decision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE, {
      requireActiveState: true,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Privileged faculty action rejected.",
          reason: decision.reason,
          accountState: authContext.profile?.account_state,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Authorized: Assessment draft initiated.",
    });
  } catch (err: unknown) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
