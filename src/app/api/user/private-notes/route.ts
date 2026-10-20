import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const authContext = await getServerAuthContext();

    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Valid session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedTargetUserId = searchParams.get("targetUserId");

    // Test Scenario 20: User ID manipulation
    // If a malicious client tries to inspect another user's private data by sending targetUserId
    if (requestedTargetUserId && requestedTargetUserId !== authContext.userId) {
      // Evaluate ownership check
      const decision = evaluatePermission(authContext, PERMISSIONS.LEARNING_NOTES_PRIVATE, {
        resourceOwnerId: requestedTargetUserId,
      });

      if (!decision.allowed) {
        return NextResponse.json(
          {
            error: "Forbidden: Cross-user private resource access is strictly denied.",
            reason: decision.reason,
          },
          { status: 403 }
        );
      }
    }

    // Always query database using server-enforced authenticated user id and Supabase RLS
    const supabase = await createClient();
    const { data: notes, error: dbError } = await supabase
      .from("private_notes")
      .select("*")
      .eq("user_id", authContext.userId);

    if (dbError) {
      return NextResponse.json({ error: "Failed to retrieve notes." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ownerId: authContext.userId,
      notes: notes || [],
    });
  } catch (err: unknown) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
