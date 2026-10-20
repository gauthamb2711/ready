import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: requests, error } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("user_id", authContext.userId)
      .order("submitted_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const accountState = authContext.profile?.account_state || "PENDING";
    const isVerified = accountState === "VERIFIED" || accountState === "ACTIVE";

    return NextResponse.json({
      success: true,
      accountState,
      isVerified,
      requests: requests || [],
    });
  } catch (err: unknown) {
    console.error("[TeacherVerificationAPI] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { organizationName, workEmail, notes } = body;

    if (!workEmail || !workEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid institutional work email is required for teacher verification." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Insert verification request
    const { data: newRequest, error: reqError } = await (supabase.from("verification_requests") as any)
      .insert({
        user_id: authContext.userId,
        target_ecosystem: "TEACHER",
        status: "PENDING",
        organization_name: organizationName?.trim() || null,
        work_email: workEmail.trim().toLowerCase(),
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (reqError) {
      return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    // Move profile state to UNDER_REVIEW if it was PENDING or REJECTED
    if (authContext.profile?.account_state === "PENDING" || authContext.profile?.account_state === "REJECTED") {
      await (supabase.from("profiles") as any)
        .update({ account_state: "UNDER_REVIEW" })
        .eq("id", authContext.userId);
    }

    return NextResponse.json({
      success: true,
      message: "Verification request submitted successfully. Platform administrators will review your credentials.",
      request: newRequest,
    });
  } catch (err: unknown) {
    console.error("[TeacherVerificationAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
