import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  getSubjectWithCurriculum,
  addCurriculumNode,
} from "@/lib/services/student-subject.service";

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
    const hierarchy = await getSubjectWithCurriculum(authContext.userId, id);
    if (!hierarchy) {
      return NextResponse.json(
        { error: "Subject not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ hierarchy });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch subject" },
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

    const { id: subjectId } = await params;
    const body = await req.json();

    const node = await addCurriculumNode(authContext.userId, subjectId, {
      unitTitle: body.unitTitle || "Unit 1",
      topicTitle: body.topicTitle || "Topic 1",
      subtopicTitle: body.subtopicTitle || "Subtopic 1",
      learningObjective: body.learningObjective || "Objective 1",
      importance: body.importance || "CORE",
    });

    return NextResponse.json({ node }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Curriculum modification failed" },
      { status: 500 }
    );
  }
}
