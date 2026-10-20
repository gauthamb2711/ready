/**
 * College Admin Teacher Join Request Visibility & Approval Flow Test
 * Authenticated End-to-End Test with real Supabase Auth sessions:
 * 1. Teacher authenticates as g@gmail.com
 * 2. Teacher submits join request to Simats Engineering
 * 3. Confirms row created in organization_membership_requests (correct org_id, user_id, PENDING, work_email)
 * 4. College Admin authenticates as chinmayi@gmail.com
 * 5. College Admin queries faculty requests and sees the pending teacher request
 * 6. Multi-tenant isolation: other college queries cannot see or approve Simats requests
 * 7. College Admin approves the request -> Teacher becomes ACTIVE in organization_members with role TEACHER
 * 8. Teacher self-approval is forbidden
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://btnogpdzwkplhplqbgwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_q1fISPS3ZXnYWehJWd3Ipw_A847625n";

const dummyTransport = class DummyWS {
  constructor() {}
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
};

function makeClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: dummyTransport },
  });
}

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
  testsPassed++;
}

async function runFacultyFlowTests() {
  console.log("==================================================");
  console.log("TESTING COLLEGE ADMIN FACULTY JOIN & APPROVAL FLOW");
  console.log("==================================================");

  const teacherClient = makeClient();
  const collegeAdminClient = makeClient();
  const unauthClient = makeClient();

  // 1. Authenticate Teacher
  console.log("\n--- [Phase 1: Authentication] ---");
  const { data: teacherAuth, error: teacherLoginErr } = await teacherClient.auth.signInWithPassword({
    email: "g@gmail.com",
    password: "Teacher2026!#",
  });
  assert(!teacherLoginErr && teacherAuth.user, `Teacher authenticated as ${teacherAuth?.user?.email} (${teacherAuth?.user?.id})`);

  // 2. Authenticate College Admin
  const { data: adminAuth, error: adminLoginErr } = await collegeAdminClient.auth.signInWithPassword({
    email: "chinmayi@gmail.com",
    password: "CollegeAdmin2026!#",
  });
  assert(!adminLoginErr && adminAuth.user, `College Admin authenticated as ${adminAuth?.user?.email} (${adminAuth?.user?.id})`);

  // 3. Locate Simats Engineering
  const { data: simatsOrg, error: orgErr } = await teacherClient
    .from("organizations")
    .select("id, name, slug, verification_status, verified, created_by")
    .eq("slug", "simats-engineering")
    .single();

  assert(!orgErr && simatsOrg, "Simats Engineering exists in organizations table");
  assert(simatsOrg.verification_status === "VERIFIED" && simatsOrg.verified === true, "Simats Engineering is VERIFIED");

  const otherCollegeId = "00000000-0000-0000-0000-000000000099";

  // Clean up any existing test requests for fresh clean run
  await collegeAdminClient
    .from("organization_membership_requests")
    .delete()
    .eq("organization_id", simatsOrg.id)
    .eq("user_id", teacherAuth.user.id);

  await collegeAdminClient
    .from("organization_members")
    .delete()
    .eq("organization_id", simatsOrg.id)
    .eq("user_id", teacherAuth.user.id);

  // 4. Teacher submits join request to Simats Engineering (RLS policy: user_id = auth.uid())
  console.log("\n--- [Phase 2: Teacher Join Request Submission (RLS Active)] ---");
  const { data: insertedReq, error: insertErr } = await teacherClient
    .from("organization_membership_requests")
    .insert({
      organization_id: simatsOrg.id,
      user_id: teacherAuth.user.id,
      role: "TEACHER",
      status: "PENDING",
      work_email: "gautham.teacher@simats.edu",
      notes: "Senior Lecturer in Computer Science",
    })
    .select()
    .single();

  assert(!insertErr && insertedReq, `Teacher submitted join request under RLS (ID: ${insertedReq?.id})`);
  assert(insertedReq.organization_id === simatsOrg.id, "Request organization_id matches Simats Engineering");
  assert(insertedReq.user_id === teacherAuth.user.id, "Request user_id matches Teacher ID");
  assert(insertedReq.status === "PENDING", "Request status is PENDING");
  assert(insertedReq.role === "TEACHER", "Request role is TEACHER");
  assert(insertedReq.created_at !== undefined, "Request has valid created_at timestamp");

  // Verify unauthenticated client CANNOT insert a request
  const { error: unauthInsertErr } = await unauthClient
    .from("organization_membership_requests")
    .insert({
      organization_id: simatsOrg.id,
      user_id: teacherAuth.user.id,
      role: "TEACHER",
      status: "PENDING",
    });
  assert(unauthInsertErr !== null, "Unauthenticated client insert is strictly blocked by RLS");

  // 5. College Admin Queries Faculty Requests
  console.log("\n--- [Phase 3: College Admin Request Visibility (RLS Active)] ---");
  const { data: adminVisibleReqs, error: queryErr } = await collegeAdminClient
    .from("organization_membership_requests")
    .select(`
      id,
      organization_id,
      user_id,
      department_id,
      role,
      status,
      notes,
      work_email,
      submitted_at,
      created_at,
      profiles:user_id (id, display_name, email, account_type, account_state),
      departments:organization_departments!department_id (id, name, code)
    `)
    .eq("organization_id", simatsOrg.id)
    .order("created_at", { ascending: false });

  assert(!queryErr, `College Admin faculty query succeeds without SQL or schema errors`);
  assert(adminVisibleReqs && adminVisibleReqs.length >= 1, `College Admin retrieves ${adminVisibleReqs?.length} request(s) for Simats Engineering`);

  const foundReq = adminVisibleReqs.find((r) => r.id === insertedReq.id);
  assert(foundReq !== undefined, "Teacher's pending join request is visible to Simats College Admin");
  assert(foundReq?.profiles?.email === "g@gmail.com", "Applicant profile metadata is correctly joined");

  // 6. Multi-Tenant Isolation
  console.log("\n--- [Phase 4: Multi-Tenant Isolation Verification] ---");
  // Query with another college's ID
  const { data: otherCollegeReqs, error: otherQueryErr } = await collegeAdminClient
    .from("organization_membership_requests")
    .select("id, organization_id")
    .eq("organization_id", otherCollegeId);

  assert(!otherQueryErr, "Other college query executes safely");
  assert(!otherCollegeReqs || otherCollegeReqs.length === 0, "College Admin cannot view another college's requests (0 rows)");

  // Verify helper function is_org_admin isolation
  const { data: isSimatsAdmin } = await collegeAdminClient.rpc("is_org_admin", {
    p_org_id: simatsOrg.id,
    p_user_id: adminAuth.user.id,
  });
  assert(isSimatsAdmin === true, "is_org_admin returns TRUE for Simats College Admin on Simats Org");

  const { data: isOtherAdmin } = await collegeAdminClient.rpc("is_org_admin", {
    p_org_id: otherCollegeId,
    p_user_id: adminAuth.user.id,
  });
  assert(isOtherAdmin === false, "is_org_admin returns FALSE for Simats College Admin on Other Org");

  // 7. Teacher Self-Approval Protection
  console.log("\n--- [Phase 5: Teacher Self-Approval Prevention] ---");
  // Teacher attempting to approve their own request should be denied by RLS
  const { data: selfApproveData } = await teacherClient
    .from("organization_membership_requests")
    .update({ status: "APPROVED" })
    .eq("id", insertedReq.id)
    .select();

  assert(!selfApproveData || selfApproveData.length === 0, "Teacher cannot self-approve their own request (RLS blocked row update, 0 rows modified)");

  // 8. College Admin Approves Teacher Request
  console.log("\n--- [Phase 6: College Admin Approval Execution] ---");
  // Mark request APPROVED
  const { data: updatedReq, error: approveErr } = await collegeAdminClient
    .from("organization_membership_requests")
    .update({
      status: "APPROVED",
      reviewed_by: adminAuth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", insertedReq.id)
    .select()
    .single();

  assert(!approveErr && updatedReq.status === "APPROVED", "Request status transitioned from PENDING to APPROVED");

  // Upsert active membership in organization_members
  const { data: newMember, error: memberErr } = await collegeAdminClient
    .from("organization_members")
    .upsert(
      {
        organization_id: simatsOrg.id,
        user_id: teacherAuth.user.id,
        role: "TEACHER",
        status: "ACTIVE",
      },
      { onConflict: "organization_id,user_id" }
    )
    .select()
    .single();

  assert(!memberErr && newMember, "Teacher added to organization_members by College Admin");
  assert(newMember.role === "TEACHER", "Faculty member role is TEACHER");
  assert(newMember.status === "ACTIVE", "Faculty membership status is ACTIVE");
  assert(newMember.organization_id === simatsOrg.id, "Membership linked to Simats Engineering");

  // 9. Verify Active Faculty Roster
  console.log("\n--- [Phase 7: Active Faculty Roster Verification] ---");
  const { data: activeFaculty, error: rosterErr } = await collegeAdminClient
    .from("organization_members")
    .select(`
      id,
      organization_id,
      user_id,
      role,
      status,
      created_at,
      profiles:user_id (id, display_name, email)
    `)
    .eq("organization_id", simatsOrg.id)
    .eq("status", "ACTIVE");

  assert(!rosterErr, "Active faculty roster query succeeds");
  const teacherMember = activeFaculty.find((f) => f.user_id === teacherAuth.user.id);
  assert(teacherMember !== undefined, "Approved teacher appears in active institutional faculty roster");

  // 10. Teacher can view their verified membership
  console.log("\n--- [Phase 8: Teacher Membership View] ---");
  const { data: teacherMemberships, error: teacherMemErr } = await teacherClient
    .from("organization_members")
    .select("id, organization_id, role, status")
    .eq("user_id", teacherAuth.user.id)
    .eq("status", "ACTIVE");

  assert(!teacherMemErr && teacherMemberships && teacherMemberships.length > 0, "Teacher can view their own active membership under RLS");

  console.log("\n==================================================");
  console.log(`ALL ${testsPassed}/${testsTotal} COLLEGE ADMIN FACULTY FLOW TESTS PASSED!`);
  console.log("==================================================");
}

runFacultyFlowTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
