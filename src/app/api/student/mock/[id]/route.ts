import { NextRequest, NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { MockService } from "@/lib/services/mock.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/api/student/mock/${id}`);
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const attemptData = await MockService.startOrResumeAttempt(userId, id);
    return NextResponse.json(attemptData);
  } catch (error: any) {
    console.error("Failed to load mock exam details:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error loading mock exam." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/api/student/mock/${id}`);
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const attemptData = await MockService.startOrResumeAttempt(userId, id);
    return NextResponse.json(attemptData);
  } catch (error: any) {
    console.error("Failed to start or resume mock attempt:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error starting mock exam." },
      { status: 500 }
    );
  }
}
