import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { LearningPlanService } from "@/lib/services/learning-plan.service";

export async function GET(req: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
    }

    const plan = await LearningPlanService.getActivePlan(authContext.userId, subjectId);
    return NextResponse.json({ plan });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch learning plan" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subjectId, forceRegenerate, regenerationReason } = body;

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
    }

    const planBundle = await LearningPlanService.generateOrRegeneratePlan({
      userId: authContext.userId,
      subjectId,
      forceRegenerate: !!forceRegenerate,
      regenerationReason,
    });

    return NextResponse.json(planBundle, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate learning plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, status, actualMinutesSpent } = body;

    if (!itemId || !status) {
      return NextResponse.json(
        { error: "itemId and status are required" },
        { status: 400 }
      );
    }

    const updated = await LearningPlanService.updateActionStatus(
      authContext.userId,
      itemId,
      status,
      actualMinutesSpent
    );

    return NextResponse.json({ item: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update action status" },
      { status: 500 }
    );
  }
}
