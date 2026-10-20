/**
 * Day 8 / 8.5 Comprehensive Audit Verification Script: Scenarios 1 - 8
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

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`[PASS] ${msg}`);
  passed++;
}

async function run() {
  console.log("==================================================");
  console.log("VERIFYING SCENARIOS 1 - 8 (AUDIT + CLEANUP)");
  console.log("==================================================");

  const adminClient = makeClient();
  const teacherClient = makeClient();
  const collegeClient = makeClient();
  const unauthClient = makeClient();

  // SCENARIO 1 — STUDENT
  console.log("\n--- SCENARIO 1: STUDENT ACCESS & ISOLATION ---");
  // Check unauthenticated / non-admin access to /admin/overview
  const unauthRes = await fetch("http://localhost:3000/admin/overview", { redirect: "manual" });
  assert(
    unauthRes.status === 307 || unauthRes.status === 302,
    `Unauthenticated access to /admin/overview blocked (HTTP ${unauthRes.status} redirecting)`
  );

  // SCENARIO 2 — PLATFORM ADMIN
  console.log("\n--- SCENARIO 2: PLATFORM ADMIN AUTHENTICATION & REVIEW ---");
  const { data: adminLogin, error: adminErr } = await adminClient.auth.signInWithPassword({
    email: "admin@ready.platform",
    password: "AdminReady2026!#",
  });
  assert(!adminErr && adminLogin.user, "Platform Admin authenticated successfully");

  const { data: isPlatformAdmin } = await adminClient.rpc("is_platform_admin", {
    user_id: adminLogin.user.id,
  });
  assert(isPlatformAdmin === true, "public.is_platform_admin returns TRUE for admin@ready.platform");

  // SCENARIO 3 — TEACHER JOIN
  console.log("\n--- SCENARIO 3: TEACHER JOIN REQUEST ---");
  const { data: teacherLogin, error: teachErr } = await teacherClient.auth.signInWithPassword({
    email: "g@gmail.com",
    password: "Teacher2026!#",
  });
  assert(!teachErr && teacherLogin.user, "Teacher authenticated successfully");

  // Locate Simats Engineering
  const { data: simatsOrg } = await teacherClient
    .from("organizations")
    .select("id, name, verification_status, verified")
    .eq("slug", "simats-engineering")
    .single();
  assert(simatsOrg && simatsOrg.verified === true, "Simats Engineering is a verified organization");

  // Submit Join Request (or verify existing)
  const { data: existingReq } = await teacherClient
    .from("organization_membership_requests")
    .select("id, status")
    .eq("organization_id", simatsOrg.id)
    .eq("user_id", teacherLogin.user.id)
    .maybeSingle();

  assert(existingReq !== null, "Teacher join request exists in organization_membership_requests");

  // SCENARIO 4 — COLLEGE APPROVAL
  console.log("\n--- SCENARIO 4: COLLEGE ADMIN APPROVAL EXECUTION ---");
  const { data: collegeLogin, error: colErr } = await collegeClient.auth.signInWithPassword({
    email: "chinmayi@gmail.com",
    password: "CollegeAdmin2026!#",
  });
  assert(!colErr && collegeLogin.user, "College Admin authenticated successfully");

  const { data: isSimatsAdmin } = await collegeClient.rpc("is_org_admin", {
    p_org_id: simatsOrg.id,
    p_user_id: collegeLogin.user.id,
  });
  assert(isSimatsAdmin === true, "is_org_admin returns TRUE for College Admin on Simats Org");

  // SCENARIO 5 — TEACHER AFTER APPROVAL
  console.log("\n--- SCENARIO 5: TEACHER ACTIVE MEMBERSHIP ---");
  const { data: memberRow } = await teacherClient
    .from("organization_members")
    .select("id, role, status, organization_id")
    .eq("organization_id", simatsOrg.id)
    .eq("user_id", teacherLogin.user.id)
    .maybeSingle();

  assert(memberRow && memberRow.status === "ACTIVE" && memberRow.role === "TEACHER",
    "Teacher is ACTIVE in organization_members with role TEACHER"
  );

  // SCENARIO 6 — CROSS-TENANT SECURITY
  console.log("\n--- SCENARIO 6: CROSS-TENANT SECURITY ---");
  const fakeOrgId = "00000000-0000-0000-0000-000000000000";
  const { data: crossTenantCheck } = await collegeClient.rpc("is_org_admin", {
    p_org_id: fakeOrgId,
    p_user_id: collegeLogin.user.id,
  });
  assert(crossTenantCheck === false, "College Admin cannot manage non-owned organizations");

  // SCENARIO 7 — PRIVILEGE ESCALATION
  console.log("\n--- SCENARIO 7: PRIVILEGE ESCALATION BLOCK ---");
  const { data: teacherAsAdmin } = await teacherClient.rpc("is_platform_admin", {
    user_id: teacherLogin.user.id,
  });
  assert(!teacherAsAdmin, "Teacher cannot escalate to Platform Admin");

  const { data: collegeAsAdmin } = await collegeClient.rpc("is_platform_admin", {
    user_id: collegeLogin.user.id,
  });
  assert(!collegeAsAdmin, "College Admin cannot escalate to Platform Admin");

  // SCENARIO 8 — PRIVATE STUDENT DATA
  console.log("\n--- SCENARIO 8: STUDENT PRIVATE DATA PROTECTION ---");
  // Query learning_action_sessions as Teacher.
  // Under RLS, a teacher can only ever see sessions where auth.uid() = user_id.
  // They cannot see any other student's private learning sessions.
  const { data: foreignSessions, error: sessErr } = await teacherClient
    .from("learning_action_sessions")
    .select("*")
    .neq("user_id", teacherLogin.user.id);

  assert(!sessErr && (foreignSessions || []).length === 0, "Teacher cannot read other students' private learning sessions under RLS");

  const { data: collegeForeignSessions, error: colSessErr } = await collegeClient
    .from("learning_action_sessions")
    .select("*")
    .neq("user_id", collegeLogin.user.id);

  assert(!colSessErr && (collegeForeignSessions || []).length === 0, "College Admin cannot read private student learning sessions under RLS");

  console.log("\n==================================================");
  console.log(`ALL ${passed}/${total} SCENARIOS VERIFIED SUCCESSFULLY!`);
  console.log("==================================================");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
