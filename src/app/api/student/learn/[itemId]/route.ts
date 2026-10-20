import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { LearningWorkspaceService } from "@/lib/services/learning-workspace.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const context = await LearningWorkspaceService.getWorkspaceContext(
      authContext.userId,
      itemId
    );

    if (!context) {
      return NextResponse.json(
        { error: "Learning action not found or unauthorized access" },
        { status: 404 }
      );
    }

    return NextResponse.json(context);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load learning workspace" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { actionType, submissions, actualMinutesSpent } = body;

    if (actionType === "SUBMIT_PRE_VERIFICATION") {
      if (!Array.isArray(submissions)) {
        return NextResponse.json(
          { error: "Submissions array is required" },
          { status: 400 }
        );
      }

      const assessment =
        await LearningWorkspaceService.submitPreLearningVerification(
          authContext.userId,
          itemId,
          submissions
        );

      return NextResponse.json({ assessment }, { status: 200 });
    }

    if (actionType === "SUBMIT_POST_VERIFICATION") {
      if (!Array.isArray(submissions)) {
        return NextResponse.json(
          { error: "Submissions array is required" },
          { status: 400 }
        );
      }

      const result =
        await LearningWorkspaceService.submitPostLearningVerification(
          authContext.userId,
          itemId,
          submissions,
          typeof actualMinutesSpent === "number" ? actualMinutesSpent : undefined
        );

      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid action type specified" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Learning workspace operation failed" },
      { status: 500 }
    );
  }
}
