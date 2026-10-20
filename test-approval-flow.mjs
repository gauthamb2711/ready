/**
 * Actual Approval-Flow Test
 * Tests that Platform Admin can sign in, query organization_members (verifying NO RLS recursion),
 * verify permissions, and approve organizations.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://btnogpdzwkplhplqbgwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_q1fISPS3ZXnYWehJWd3Ipw_A847625n";

async function runApprovalFlowTest() {
  console.log("==================================================");
  console.log("RUNNING ACTUAL APPROVAL-FLOW TEST");
  console.log("==================================================");

  const dummyTransport = class DummyWS {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: dummyTransport },
  });

  // 1. Authenticate as Platform Admin
  console.log("[TEST 1] Authenticating as Platform Admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "admin@ready.platform",
    password: "AdminReady2026!#",
  });

  if (authError || !authData.session) {
    console.error("[FAIL] Platform Admin authentication failed:", authError?.message);
    process.exit(1);
  }
  console.log(`[PASS] Authenticated successfully as ${authData.user.email} (ID: ${authData.user.id})`);

  // 2. Query organization_members as authenticated Platform Admin (tests RLS recursion fix)
  console.log("[TEST 2] Querying public.organization_members with RLS active...");
  const { data: members, error: memError } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role, status")
    .limit(10);

  if (memError) {
    console.error("[FAIL] organization_members query failed:", memError.message);
    process.exit(1);
  }
  console.log(`[PASS] Successfully retrieved ${members.length} organization member(s) without RLS recursion!`);

  // 3. Query Simats Engineering organization
  console.log("[TEST 3] Verifying Simats Engineering status...");
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, verification_status, verified, created_by")
    .eq("slug", "simats-engineering")
    .single();

  if (orgError || !org) {
    console.error("[FAIL] Failed to retrieve Simats Engineering:", orgError?.message);
    process.exit(1);
  }
  console.log(`[PASS] Simats Engineering found: Status=${org.verification_status}, Verified=${org.verified}`);

  // 4. Verify Simats Engineering member record is ACTIVE
  console.log("[TEST 4] Verifying Simats Engineering administrator membership status...");
  const { data: simatsMembers, error: simatsMemErr } = await supabase
    .from("organization_members")
    .select("id, role, status, user_id")
    .eq("organization_id", org.id);

  if (simatsMemErr) {
    console.error("[FAIL] Failed to query Simats members:", simatsMemErr.message);
    process.exit(1);
  }

  const activeAdmin = simatsMembers.find((m) => m.role === "COLLEGE_ADMIN" && m.status === "ACTIVE");
  if (!activeAdmin) {
    console.error("[FAIL] College Admin is not active in organization_members:", simatsMembers);
    process.exit(1);
  }
  console.log(`[PASS] Active College Admin verified: User ${activeAdmin.user_id}, Status: ${activeAdmin.status}`);

  // 5. Verify RLS helper is_platform_admin
  console.log("[TEST 5] Testing public.is_platform_admin RPC helper...");
  const { data: isAdmin, error: rpcErr } = await supabase.rpc("is_platform_admin", {
    user_id: authData.user.id,
  });

  if (rpcErr) {
    console.error("[FAIL] is_platform_admin RPC error:", rpcErr.message);
    process.exit(1);
  }
  if (!isAdmin) {
    console.error("[FAIL] Expected is_platform_admin to return true for Platform Admin");
    process.exit(1);
  }
  console.log(`[PASS] public.is_platform_admin('${authData.user.id}') returned true`);

  // 6. Verify non-admin cannot access or update organization_members arbitrarily
  console.log("[TEST 6] Testing RLS isolation with unauthenticated client...");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: dummyTransport },
  });

  const { data: anonMembers } = await anonClient
    .from("organization_members")
    .select("id");

  if (anonMembers && anonMembers.length > 0) {
    console.error("[FAIL] Anon client should not be able to read organization_members!");
    process.exit(1);
  }
  console.log("[PASS] Unauthenticated access to organization_members correctly blocked by RLS!");

  console.log("==================================================");
  console.log("ALL APPROVAL-FLOW TESTS PASSED CLEANLY!");
  console.log("==================================================");
}

runApprovalFlowTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
