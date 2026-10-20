import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { getOrganizationById, checkIsOrganizationAdmin } from "@/lib/services/organization.service";
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

    const { id } = await params;
    const organization = await getOrganizationById(id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (err: any) {
    console.error("[OrganizationDetailsAPI] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
