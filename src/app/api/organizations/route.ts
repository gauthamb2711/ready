import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  createOrganization,
  getVerifiedOrganizations,
  getTeacherOrganizations,
} from "@/lib/services/organization.service";
import type { OrgType } from "@/types/database.types";

export async function GET(request: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const mine = searchParams.get("mine") === "true";

    if (mine) {
      const myOrgs = await getTeacherOrganizations(authContext.userId);
      return NextResponse.json({ success: true, organizations: myOrgs.organizations || [] });
    }

    const organizations = await getVerifiedOrganizations(search);
    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (err: any) {
    console.error("[OrganizationsAPI] GET error:", err);
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
    const { name, slug, type, officialEmail, website, accreditationNumber, notes, documents } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Valid organization name is required (at least 2 characters)." }, { status: 400 });
    }

    const validTypes: OrgType[] = ["COLLEGE", "UNIVERSITY", "COMPANY", "OTHER"];
    const orgType: OrgType = validTypes.includes(type) ? type : "COLLEGE";

    const result = await createOrganization(authContext.userId, {
      name,
      slug,
      type: orgType,
      officialEmail,
      website,
      accreditationNumber,
      notes,
      documents,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create organization" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      organization: result.organization,
      message: "Organization created successfully in PENDING verification state.",
    });
  } catch (err: any) {
    console.error("[OrganizationsAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
