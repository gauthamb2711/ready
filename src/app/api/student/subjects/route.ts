import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  getStudentSubjects,
  createStudentSubject,
} from "@/lib/services/student-subject.service";

export async function GET() {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await getStudentSubjects(authContext.userId);
    return NextResponse.json({ subjects });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list subjects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user strictly from server session (never trust client-supplied user_id)
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Safe server-side check: Required application user/profile record must exist
    if (!authContext.profile) {
      return NextResponse.json(
        { error: "Student profile record not found. Please complete profile initialization." },
        { status: 400 }
      );
    }

    // 3. Account state check: Disallow suspended, revoked, or rejected accounts
    const accountState = authContext.profile.account_state;
    if (accountState === "SUSPENDED" || accountState === "REVOKED" || accountState === "REJECTED") {
      return NextResponse.json(
        { error: `Account state is ${accountState}. Subject creation is disabled.` },
        { status: 403 }
      );
    }

    // 4. Role / Ecosystem check: User must be allowed to create student subjects
    const isStudentAllowed =
      authContext.profile.account_type === "STUDENT" ||
      authContext.roles.some((r) => r.role === "STUDENT" || r.role === "PLATFORM_ADMIN");

    if (!isStudentAllowed) {
      return NextResponse.json(
        { error: "Only student accounts and platform administrators are authorized to create curriculum subjects." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      examDate,
      targetScore,
      dailyTimeMinutes,
      preparationLevel,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    // 5. Create subject using verified server auth identity (body.user_id is strictly ignored)
    const subject = await createStudentSubject(authContext.userId, {
      name: name.trim(),
      description: description || undefined,
      examDate: examDate || undefined,
      targetScore: targetScore || "80",
      availableDailyStudyTime: String(dailyTimeMinutes || 60),
      currentPrepLevel: preparationLevel || "NOT_STARTED",
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create subject" },
      { status: 500 }
    );
  }
}
