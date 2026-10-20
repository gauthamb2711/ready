import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  getOrganizationDepartments,
  createOrganizationDepartment,
} from "@/lib/services/organization.service";

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
    const departments = await getOrganizationDepartments(organizationId);

    return NextResponse.json({
      success: true,
      departments,
    });
  } catch (err: any) {
    console.error("[DepartmentsAPI] GET error:", err);
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
    const { name, code } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Valid department name is required." }, { status: 400 });
    }

    const result = await createOrganizationDepartment(
      organizationId,
      authContext.userId,
      name,
      code
    );

    if (!result.success) {
      const isForbidden = result.error?.includes("Forbidden");
      return NextResponse.json({ error: result.error }, { status: isForbidden ? 403 : 400 });
    }

    return NextResponse.json({
      success: true,
      department: result.department,
      message: "Department created successfully.",
    });
  } catch (err: any) {
    console.error("[DepartmentsAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
