import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  getDiagnosticSession,
  submitDiagnosticAssessment,
} from "@/lib/services/diagnostic.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const session = await getDiagnosticSession(authContext.userId, id);
    if (!session) {
      return NextResponse.json(
        { error: "Diagnostic not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load diagnostic session" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: diagnosticId } = await params;
    const body = await req.json();
    const { action, responses } = body;

    if (action === "submit") {
      const result = await submitDiagnosticAssessment(
        authContext.userId,
        diagnosticId,
        Array.isArray(responses) ? responses : []
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Diagnostic operation failed" },
      { status: 500 }
    );
  }
}
