import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  submitOrganizationVerification,
  reviewOrganization,
  checkIsPlatformAdmin,
  checkIsOrganizationAdmin,
} from "@/lib/services/organization.service";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId } = await params;
    const supabase = await createClient();

    const isPlatformAdmin = await checkIsPlatformAdmin(supabase, authContext.userId);
    const orgAdminCheck = await checkIsOrganizationAdmin(supabase, authContext.userId, organizationId);

    if (!isPlatformAdmin && !orgAdminCheck.isOrgAdmin) {
      return NextResponse.json({ error: "Forbidden: Not authorized to view organization verification details." }, { status: 403 });
    }

    const { data: verification } = await supabase
      .from("organization_verifications")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      verification: verification || null,
    });
  } catch (err: any) {
    console.error("[OrganizationVerificationAPI] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId } = await params;
    const body = await request.json().catch(() => ({}));
    const { action, officialEmail, website, accreditationNumber, notes, documents, reviewAction, reviewNotes } = body;

    // Platform Admin Review Action
    if (action === "REVIEW" || reviewAction) {
      const targetAction = reviewAction || body.status;
      const validActions = ["APPROVE", "REJECT", "SUSPEND", "REVOKE"];
      if (!validActions.includes(targetAction)) {
        return NextResponse.json({ error: "Invalid review action. Must be APPROVE, REJECT, SUSPEND, or REVOKE." }, { status: 400 });
      }

      const reviewResult = await reviewOrganization(
        organizationId,
        authContext.userId,
        targetAction,
        reviewNotes || notes
      );

      if (!reviewResult.success) {
        return NextResponse.json({ error: reviewResult.error }, { status: reviewResult.error?.includes("Forbidden") ? 403 : 400 });
      }

      return NextResponse.json({
        success: true,
        status: reviewResult.status,
        message: `Organization successfully set to ${reviewResult.status}.`,
      });
    }

    // Default Action: Organization Admin submitting verification details
    if (!officialEmail || !officialEmail.includes("@")) {
      return NextResponse.json({ error: "A valid official organization email is required." }, { status: 400 });
    }

    const submitResult = await submitOrganizationVerification(organizationId, authContext.userId, {
      officialEmail,
      website,
      accreditationNumber,
      notes,
      documents,
    });

    if (!submitResult.success) {
      return NextResponse.json({ error: submitResult.error }, { status: submitResult.error?.includes("Unauthorized") ? 403 : 400 });
    }

    return NextResponse.json({
      success: true,
      verification: submitResult.verification,
      message: "Organization verification submitted successfully.",
    });
  } catch (err: any) {
    console.error("[OrganizationVerificationAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
