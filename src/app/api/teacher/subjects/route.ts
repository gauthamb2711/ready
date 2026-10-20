import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createTeacherSubject, getTeacherSubjects } from "@/lib/services/teacher.service";

export async function GET() {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await getTeacherSubjects(authContext.userId);
    return NextResponse.json({ success: true, subjects });
  } catch (err: unknown) {
    console.error("[TeacherSubjectsAPI] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, code, description, education_level, academic_year, organization_id } = body;

    let targetOrgId: string | null = null;
    if (organization_id && typeof organization_id === "string" && organization_id.trim()) {
      targetOrgId = organization_id.trim();
    }

    // Check COURSE_CREATE permission (scoped to organization if specified)
    const decision = evaluatePermission(authContext, PERMISSIONS.COURSE_CREATE, {
      organizationId: targetOrgId,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to create subjects.",
          reason: decision.reason,
        },
        { status: 403 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
    }

    const subject = await createTeacherSubject(authContext.userId, {
      name,
      code,
      description,
      education_level,
      academic_year,
      organization_id: targetOrgId,
    });

    return NextResponse.json({ success: true, subject }, { status: 201 });
  } catch (err: unknown) {
    console.error("[TeacherSubjectsAPI] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
