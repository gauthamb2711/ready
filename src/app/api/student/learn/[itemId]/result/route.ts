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

    const result = await LearningWorkspaceService.getLearningGainResult(
      authContext.userId,
      itemId
    );

    if (!result) {
      return NextResponse.json(
        { error: "Learning gain result not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch learning gain result" },
      { status: 500 }
    );
  }
}
