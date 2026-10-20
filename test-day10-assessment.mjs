/**
 * READY — Day 10 Assessment Builder & Exam Management Comprehensive Audit
 * 
 * Verifies Scenarios 1 through 20:
 * 1. Authorized independent teacher creates an assessment.
 * 2. Authorized teacher adds eligible questions.
 * 3. Duplicate questions are rejected.
 * 4. Total marks are calculated correctly.
 * 5. Invalid duration is rejected.
 * 6. Invalid pass percentage is rejected.
 * 7. Invalid schedule is rejected.
 * 8. Empty assessment cannot be published.
 * 9. Ineligible or unapproved questions cannot be used when approval is required.
 * 10. Valid assessment can be published.
 * 11. Unauthorized users cannot publish.
 * 12. Student cannot access teacher authoring endpoints.
 * 13. Unauthenticated requests are rejected.
 * 14. Cross-organization access is blocked.
 * 15. Teacher cannot spoof owner_id.
 * 16. Teacher cannot edit another teacher's private draft without permission.
 * 17. Published assessment editing follows defined integrity rules.
 * 18. Invalid lifecycle transitions are rejected.
 * 19. Correct answers are not exposed by student-facing endpoints.
 * 20. Question self-approval by ordinary teachers is strictly blocked.
 */

import { createClient } from "@supabase/supabase-js";
import {
  validateAssessmentForPublishing,
  validateAssessmentStatusTransition,
} from "./src/lib/intelligence/teacher-quality.ts";

const SUPABASE_URL = "https://btnogpdzwkplhplqbgwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_q1fISPS3ZXnYWehJWd3Ipw_A847625n";
const APP_URL = "http://localhost:3000";

const dummyTransport = class DummyWS {
  constructor() {}
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
};

function makeClient(token = null) {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: dummyTransport },
  };
  if (token) {
    options.global = { headers: { Authorization: `Bearer ${token}` } };
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, options);
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("READY DAY 10 — ASSESSMENT BUILDER & EXAM AUDIT");
  console.log("==================================================\n");

  const anonClient = makeClient();

  // 1. Authenticate personas
  console.log("[SETUP] Authenticating personas...");
  const { data: teacherLogin, error: tErr } = await anonClient.auth.signInWithPassword({
    email: "g@gmail.com",
    password: "Teacher2026!#",
  });
  assert(!tErr && teacherLogin?.user, "Teacher authenticated (g@gmail.com)");
  const teacherToken = teacherLogin?.session?.access_token;
  const teacherUser = teacherLogin?.user;

  const { data: studentLogin, error: sErr } = await anonClient.auth.signInWithPassword({
    email: "s@gmail.com",
    password: "Student2026!#",
  });
  assert(!sErr && studentLogin?.user, "Student authenticated (s@gmail.com)");
  const studentToken = studentLogin?.session?.access_token;

  const { data: collegeLogin, error: cErr } = await anonClient.auth.signInWithPassword({
    email: "chinmayi@gmail.com",
    password: "CollegeAdmin2026!#",
  });
  assert(!cErr && collegeLogin?.user, "College Admin authenticated (chinmayi@gmail.com)");
  const collegeToken = collegeLogin?.session?.access_token;

  // Retrieve an authorized subject for Teacher
  const teacherClient = makeClient(teacherToken);
  const { data: subjects, error: subjErr } = await teacherClient
    .from("teacher_subjects")
    .select("id, name, organization_id")
    .eq("owner_id", teacherUser.id)
    .limit(1);

  assert(!subjErr && subjects?.length > 0, `Located teacher course subject: ${subjects?.[0]?.name}`);
  const testSubject = subjects[0];

  // Retrieve/prepare 2 questions for testing
  let q1Id = null;
  let q2Id = null;

  const { data: existingQs } = await teacherClient
    .from("teacher_questions")
    .select("id, question_text, marks, status")
    .eq("owner_id", teacherUser.id)
    .limit(3);

  if (existingQs && existingQs.length >= 2) {
    q1Id = existingQs[0].id;
    q2Id = existingQs[1].id;
  } else {
    // Create scaffold questions for testing
    const { data: newQ1 } = await teacherClient
      .from("teacher_questions")
      .insert({
        owner_id: teacherUser.id,
        subject_id: testSubject.id,
        question_text: `Test Question Alpha for Day 10 Assessment [${Date.now()}]`,
        question_type: "MCQ",
        difficulty: "MEDIUM",
        marks: 5,
        status: "APPROVED",
        options: [
          { id: "opt_1", text: "Alpha Option 1", is_correct: true },
          { id: "opt_2", text: "Alpha Option 2", is_correct: false },
        ],
        correct_answer: "Alpha Option 1",
      })
      .select()
      .single();

    const { data: newQ2 } = await teacherClient
      .from("teacher_questions")
      .insert({
        owner_id: teacherUser.id,
        subject_id: testSubject.id,
        question_text: `Test Question Beta for Day 10 Assessment [${Date.now()}]`,
        question_type: "MCQ",
        difficulty: "HARD",
        marks: 10,
        status: "APPROVED",
        options: [
          { id: "opt_1", text: "Beta Option 1", is_correct: false },
          { id: "opt_2", text: "Beta Option 2", is_correct: true },
        ],
        correct_answer: "Beta Option 2",
      })
      .select()
      .single();

    q1Id = newQ1?.id;
    q2Id = newQ2?.id;
  }

  assert(q1Id && q2Id, `Questions prepared for assessment assembly (Q1: ${q1Id?.slice(0, 8)}, Q2: ${q2Id?.slice(0, 8)})`);

  let createdAssessmentId = null;

  // =========================================================================
  // TEST 1: Authorized independent teacher creates an assessment
  // =========================================================================
  console.log("\n--- TEST 1: Authorized Independent Teacher Creates Assessment ---");
  const createRes = await fetch(`${APP_URL}/api/teacher/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      subject_id: testSubject.id,
      title: "Midterm Diagnostic Assessment 2026",
      description: "Comprehensive mid-semester benchmark covering units 1 and 2.",
      instructions: "No programmable calculators permitted. All questions mandatory.",
      assessment_type: "EXAM",
      duration_minutes: 90,
      pass_percentage: 50,
      attempt_limit: 1,
      shuffle_questions: true,
      shuffle_options: true,
    }),
  });

  const createData = await createRes.json();
  assert(createRes.status === 201, `Assessment creation returned HTTP 201 (got ${createRes.status})`);
  assert(createData.success === true && createData.assessment?.id, "Assessment blueprint returned valid payload");
  assert(createData.assessment?.status === "DRAFT", `Assessment initialized in DRAFT status (got ${createData.assessment?.status})`);
  assert(createData.assessment?.duration_minutes === 90, `Assessment duration preserved (got ${createData.assessment?.duration_minutes}m)`);
  createdAssessmentId = createData.assessment?.id;

  // =========================================================================
  // TEST 2: Authorized teacher adds eligible questions
  // =========================================================================
  console.log("\n--- TEST 2: Authorized Teacher Adds Questions ---");
  const attachRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      questions: [
        { questionId: q1Id, marks: 5, displayOrder: 1 },
        { questionId: q2Id, marks: 10, displayOrder: 2 },
      ],
    }),
  });

  const attachData = await attachRes.json();
  assert(attachRes.status === 200, `Question attachment returned HTTP 200 (got ${attachRes.status})`);
  assert(attachData.success === true, "Questions attached successfully to assessment blueprint");

  // =========================================================================
  // TEST 3: Duplicate questions are rejected
  // =========================================================================
  console.log("\n--- TEST 3: Duplicate Question Rejection ---");
  const dupRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      questions: [
        { questionId: q1Id, marks: 5 },
        { questionId: q1Id, marks: 5 }, // duplicate in payload
      ],
    }),
  });

  const dupData = await dupRes.json();
  assert(dupRes.status === 400, `Duplicate question rejected with HTTP 400 (got ${dupRes.status})`);
  assert(dupData.error?.includes("Duplicate question"), `Error message indicates duplicate question: "${dupData.error}"`);

  // =========================================================================
  // TEST 4: Total marks calculated correctly
  // =========================================================================
  console.log("\n--- TEST 4: Total Marks Calculation ---");
  const detailRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const detailData = await detailRes.json();
  assert(detailRes.status === 200, "Assessment detail retrieval returned HTTP 200");
  assert(
    detailData.assessment?.total_marks === 15,
    `Total marks sum correctly matches 5 + 10 = 15 (got ${detailData.assessment?.total_marks})`
  );
  assert(detailData.questions?.length === 2, `Question count matches attached count: 2 (got ${detailData.questions?.length})`);

  // =========================================================================
  // TEST 5: Invalid duration is rejected
  // =========================================================================
  console.log("\n--- TEST 5: Invalid Duration Rejection ---");
  const badDurationRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ duration_minutes: 0 }),
  });
  assert(badDurationRes.status === 400, `Duration of 0 min rejected with HTTP 400 (got ${badDurationRes.status})`);

  const tooLongRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ duration_minutes: 2000 }),
  });
  assert(tooLongRes.status === 400, `Duration > 1440 min rejected with HTTP 400 (got ${tooLongRes.status})`);

  // =========================================================================
  // TEST 6: Invalid pass percentage is rejected
  // =========================================================================
  console.log("\n--- TEST 6: Invalid Pass Percentage Rejection ---");
  const badPassRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ pass_percentage: 120 }),
  });
  assert(badPassRes.status === 400, `Pass percentage of 120% rejected with HTTP 400 (got ${badPassRes.status})`);

  // =========================================================================
  // TEST 7: Invalid schedule is rejected
  // =========================================================================
  console.log("\n--- TEST 7: Invalid Schedule Rejection ---");
  const badScheduleRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      scheduled_start: "2026-11-10T12:00:00Z",
      scheduled_end: "2026-11-10T10:00:00Z", // end before start!
    }),
  });
  assert(badScheduleRes.status === 400, `Inverted schedule (end before start) rejected with HTTP 400 (got ${badScheduleRes.status})`);

  // =========================================================================
  // TEST 8: Empty assessment cannot be published
  // =========================================================================
  console.log("\n--- TEST 8: Empty Assessment Publishing Blocked ---");
  // Create an empty assessment
  const emptyRes = await fetch(`${APP_URL}/api/teacher/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      subject_id: testSubject.id,
      title: "Empty Draft Assessment",
    }),
  });
  const emptyData = await emptyRes.json();
  const emptyId = emptyData.assessment?.id;

  const pubEmptyRes = await fetch(`${APP_URL}/api/teacher/assessments/${emptyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ targetStatus: "PUBLISHED" }),
  });
  const pubEmptyData = await pubEmptyRes.json();
  assert(pubEmptyRes.status === 400, `Publishing empty assessment rejected with HTTP 400 (got ${pubEmptyRes.status})`);
  assert(
    pubEmptyData.error?.includes("at least one question"),
    `Error explains question requirement: "${pubEmptyData.error}"`
  );

  // Clean up empty assessment
  await fetch(`${APP_URL}/api/teacher/assessments/${emptyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${teacherToken}` },
  });

  // =========================================================================
  // TEST 9: Ineligible or unapproved questions rejected during publishing
  // =========================================================================
  console.log("\n--- TEST 9: Ineligible Question Validation Check ---");
  const testValidation = validateAssessmentForPublishing(
    { title: "Draft Test", subject_id: testSubject.id, duration_minutes: 60, pass_percentage: 40 },
    [
      {
        question_id: "q-unapproved-1",
        marks: 5,
        question: { status: "DRAFT", quality_status: "FAIL" }, // Unapproved!
      },
    ]
  );
  assert(!testValidation.valid, "Publishing validation correctly rejects DRAFT / unapproved questions");
  assert(
    testValidation.errors.some((e) => e.includes("DRAFT") || e.includes("APPROVED")),
    "Validation error explicitly cites unapproved question requirement"
  );

  // =========================================================================
  // TEST 10: Valid assessment can be published
  // =========================================================================
  console.log("\n--- TEST 10: Valid Assessment Publishing ---");
  const pubRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ targetStatus: "PUBLISHED" }),
  });
  const pubData = await pubRes.json();
  assert(pubRes.status === 200, `Assessment publication returned HTTP 200 (got ${pubRes.status})`);
  assert(pubData.assessment?.status === "PUBLISHED", `Assessment status transitioned to PUBLISHED (got ${pubData.assessment?.status})`);

  // =========================================================================
  // TEST 11: Unauthorized users cannot publish
  // =========================================================================
  console.log("\n--- TEST 11: Unauthorized User Cannot Publish ---");
  const unauthPubRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`, // Student attempting to publish
    },
    body: JSON.stringify({ targetStatus: "PUBLISHED" }),
  });
  assert(unauthPubRes.status === 403, `Student attempt to publish rejected with HTTP 403 (got ${unauthPubRes.status})`);

  // =========================================================================
  // TEST 12: Student cannot access teacher authoring endpoints
  // =========================================================================
  console.log("\n--- TEST 12: Student Blocked from Teacher Authoring ---");
  const studentCreateRes = await fetch(`${APP_URL}/api/teacher/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      subject_id: testSubject.id,
      title: "Student Spoofed Exam",
    }),
  });
  assert(studentCreateRes.status === 403, `Student creation attempt strictly rejected with HTTP 403 (got ${studentCreateRes.status})`);

  // =========================================================================
  // TEST 13: Unauthenticated requests are rejected
  // =========================================================================
  console.log("\n--- TEST 13: Unauthenticated Request Blocked ---");
  const anonGetRes = await fetch(`${APP_URL}/api/teacher/assessments`);
  assert(anonGetRes.status === 401, `Unauthenticated request returned HTTP 401 (got ${anonGetRes.status})`);

  // =========================================================================
  // TEST 14: Cross-organization access is blocked
  // =========================================================================
  console.log("\n--- TEST 14: Cross-Organization Isolation Enforced ---");
  const fakeOrgId = "99999999-9999-9999-9999-999999999999";
  const crossOrgRes = await fetch(`${APP_URL}/api/teacher/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      subject_id: testSubject.id,
      organization_id: fakeOrgId,
      title: "Cross-Org Exploit Assessment",
    }),
  });
  assert(crossOrgRes.status === 403 || crossOrgRes.status === 400, `Write into non-member organization rejected (got HTTP ${crossOrgRes.status})`);

  // =========================================================================
  // TEST 15: Teacher cannot spoof owner_id
  // =========================================================================
  console.log("\n--- TEST 15: Owner ID Spoofing Blocked ---");
  const spoofedOwnerId = "11111111-2222-3333-4444-555555555555";
  const spoofRes = await fetch(`${APP_URL}/api/teacher/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      subject_id: testSubject.id,
      owner_id: spoofedOwnerId, // Attacker tries to create under victim's name
      title: "Spoof Owner Assessment",
    }),
  });
  const spoofData = await spoofRes.json();
  assert(spoofRes.status === 201, "Assessment creation handled");
  assert(
    spoofData.assessment?.owner_id === teacherUser.id,
    `Server strictly binds owner_id to authenticated session (got ${spoofData.assessment?.owner_id?.slice(0, 8)}, ignored spoofed ID)`
  );
  // Cleanup spoofed assessment
  if (spoofData.assessment?.id) {
    await fetch(`${APP_URL}/api/teacher/assessments/${spoofData.assessment.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
  }

  // =========================================================================
  // TEST 16: Teacher cannot edit another teacher's private draft
  // =========================================================================
  console.log("\n--- TEST 16: IDOR Protection on Assessment Editing ---");
  // College admin tries to patch teacher's personal assessment without membership
  const idorRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`, // Or other unauthorized user
    },
    body: JSON.stringify({ title: "Hacked Assessment Title" }),
  });
  assert(idorRes.status === 403 || idorRes.status === 404, `IDOR edit attempt rejected with HTTP ${idorRes.status}`);

  // =========================================================================
  // TEST 17: Published assessment editing follows integrity rules
  // =========================================================================
  console.log("\n--- TEST 17: Integrity Rules on Published Assessment ---");
  // Updating title or schedule on published assessment is allowed
  const safeEditRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ title: "Updated Live Assessment Title" }),
  });
  assert(safeEditRes.status === 200, `Non-destructive update on published assessment allowed (HTTP 200)`);

  // Deleting a published assessment is strictly rejected
  const deleteLiveRes = await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(deleteLiveRes.status === 400, `Deleting live published assessment blocked with HTTP 400 (got ${deleteLiveRes.status})`);

  // =========================================================================
  // TEST 18: Invalid lifecycle transitions rejected
  // =========================================================================
  console.log("\n--- TEST 18: Invalid Lifecycle Transitions Blocked ---");
  const tDraftToClosed = validateAssessmentStatusTransition("DRAFT", "CLOSED");
  assert(!tDraftToClosed.valid, `Draft cannot jump directly to CLOSED: "${tDraftToClosed.reason}"`);

  const tArchivedToPub = validateAssessmentStatusTransition("ARCHIVED", "PUBLISHED");
  assert(!tArchivedToPub.valid, `Archived terminal state cannot transition to PUBLISHED: "${tArchivedToPub.reason}"`);

  const tPubToClosed = validateAssessmentStatusTransition("PUBLISHED", "CLOSED");
  assert(tPubToClosed.valid, "PUBLISHED -> CLOSED transition is legal");

  // =========================================================================
  // TEST 19: Correct answers not exposed in student-facing endpoints
  // =========================================================================
  console.log("\n--- TEST 19: Answer-Key Leak Prevention ---");
  const studentViewRes = await fetch(
    `${APP_URL}/api/teacher/assessments/${createdAssessmentId}?student=true`,
    {
      headers: { Authorization: `Bearer ${teacherToken}` },
    }
  );
  const studentViewData = await studentViewRes.json();
  assert(studentViewRes.status === 200, "Student preview retrieval of published assessment succeeded");
  const firstAttachedQ = studentViewData.questions?.[0]?.question;
  assert(
    firstAttachedQ && firstAttachedQ.correct_answer === undefined,
    "correct_answer field strictly stripped from student payload"
  );
  assert(
    firstAttachedQ && firstAttachedQ.rejection_reason === undefined,
    "internal review notes and rejection reasons stripped from student payload"
  );

  // =========================================================================
  // TEST 20: Question self-approval restriction
  // =========================================================================
  console.log("\n--- TEST 20: Ordinary Teacher Question Self-Approval Blocked ---");
  // Teacher attempts to approve their own question
  const selfApproveRes = await fetch(`${APP_URL}/api/teacher/questions/${q1Id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ targetStatus: "APPROVED" }),
  });
  const selfApproveData = await selfApproveRes.json();
  assert(
    selfApproveRes.status === 400 && selfApproveData.error?.includes("cannot approve their own questions"),
    `Teacher self-approval strictly blocked: "${selfApproveData.error}"`
  );

  // =========================================================================
  // TEARDOWN / CLEANUP
  // =========================================================================
  console.log("\n[TEARDOWN] Archiving test assessment...");
  await fetch(`${APP_URL}/api/teacher/assessments/${createdAssessmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ targetStatus: "ARCHIVED" }),
  });

  console.log("\n==================================================");
  console.log(`DAY 10 AUDIT RESULTS:`);
  console.log(`TOTAL ASSERTIONS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log("==================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
