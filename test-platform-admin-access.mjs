/**
 * READY Platform - Platform Admin Access & Organization Review Engine Verification Tests
 */

import assert from "node:assert";
import { PERMISSIONS, ROLE_PERMISSIONS_MAP } from "./src/lib/rbac/permissions.ts";
import { evaluatePermission } from "./src/lib/rbac/access-control.ts";
import { checkIsPlatformAdmin } from "./src/lib/services/organization.service.ts";

console.log("==================================================");
console.log("TESTING PLATFORM ADMIN ACCESS & VERIFICATION REVIEW");
console.log("==================================================");

let testsPassed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

// 1. RBAC Permissions Mapping Enforcement
runTest("Platform Admin has platform:admin permission mapped", () => {
  const adminPermissions = ROLE_PERMISSIONS_MAP.PLATFORM_ADMIN || [];
  assert.strictEqual(adminPermissions.includes(PERMISSIONS.PLATFORM_ADMIN), true);
});

runTest("Platform Admin has org:verify permission mapped", () => {
  const adminPermissions = ROLE_PERMISSIONS_MAP.PLATFORM_ADMIN || [];
  assert.strictEqual(adminPermissions.includes(PERMISSIONS.ORG_VERIFY), true);
});

runTest("College Admin CANNOT have platform:admin permission", () => {
  const collegePermissions = ROLE_PERMISSIONS_MAP.COLLEGE_ADMIN || [];
  assert.strictEqual(collegePermissions.includes(PERMISSIONS.PLATFORM_ADMIN), false);
});

runTest("Teacher CANNOT have platform:admin or org:verify permission", () => {
  const teacherPermissions = ROLE_PERMISSIONS_MAP.TEACHER || [];
  assert.strictEqual(teacherPermissions.includes(PERMISSIONS.PLATFORM_ADMIN), false);
  assert.strictEqual(teacherPermissions.includes(PERMISSIONS.ORG_VERIFY), false);
});

runTest("Student CANNOT have platform:admin or org:verify permission", () => {
  const studentPermissions = ROLE_PERMISSIONS_MAP.STUDENT || [];
  assert.strictEqual(studentPermissions.includes(PERMISSIONS.PLATFORM_ADMIN), false);
  assert.strictEqual(studentPermissions.includes(PERMISSIONS.ORG_VERIFY), false);
});

// 2. evaluatePermission with Platform Admin Context
runTest("evaluatePermission allows PLATFORM_ADMIN to access ORG_VERIFY", () => {
  const ctx = {
    userId: "admin-1",
    profile: { id: "admin-1", account_state: "ACTIVE" },
    roles: [{ id: "r1", user_id: "admin-1", role: "PLATFORM_ADMIN" }],
  };

  const decision = evaluatePermission(ctx, { permission: PERMISSIONS.ORG_VERIFY });
  assert.strictEqual(decision.allowed, true);
});

runTest("evaluatePermission DENIES regular user without PLATFORM_ADMIN from ORG_VERIFY", () => {
  const ctx = {
    userId: "student-1",
    profile: { id: "student-1", account_state: "ACTIVE" },
    roles: [{ id: "r2", user_id: "student-1", role: "STUDENT" }],
  };

  const decision = evaluatePermission(ctx, { permission: PERMISSIONS.ORG_VERIFY });
  assert.strictEqual(decision.allowed, false);
});

// 3. checkIsPlatformAdmin verification
await runAsyncTest("checkIsPlatformAdmin returns true for user with PLATFORM_ADMIN in user_roles", async () => {
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: (col, val) => ({
          maybeSingle: async () => ({
            data: { id: "profile-admin", email: "admin@ready.platform", metadata: { system_role: "PLATFORM_ADMIN" } },
          }),
          then: (resolve) =>
            resolve({
              data: [{ role: "PLATFORM_ADMIN" }],
            }),
        }),
      }),
    }),
  };

  const isAdmin = await checkIsPlatformAdmin(mockSupabase, "admin-user-id");
  assert.strictEqual(isAdmin, true);
});

await runAsyncTest("checkIsPlatformAdmin returns false for user without PLATFORM_ADMIN", async () => {
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: (col, val) => ({
          maybeSingle: async () => ({
            data: { id: "user-123", email: "user@gmail.com", metadata: {} },
          }),
          then: (resolve) =>
            resolve({
              data: [{ role: "STUDENT" }],
            }),
        }),
      }),
    }),
  };

  const isAdmin = await checkIsPlatformAdmin(mockSupabase, "user-123");
  assert.strictEqual(isAdmin, false);
});

console.log("==================================================");
console.log(`ALL ${testsPassed} PLATFORM ADMIN ACCESS TESTS PASSED!`);
console.log("==================================================");
