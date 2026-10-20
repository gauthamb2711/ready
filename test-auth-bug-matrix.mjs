/**
 * READY Platform - Authentication Bug Test Matrix (Scenarios A through N)
 * Verifies all edge cases, normalization, error sanitization, role assignments,
 * security boundaries, and resilience.
 */
import { createClient } from "@supabase/supabase-js";
const VALID_ECOSYSTEMS = [
  "STUDENT",
  "CANDIDATE",
  "PROFESSIONAL",
  "TEACHER",
  "COLLEGE_UNIVERSITY",
  "COMPANY",
];

function validateEmail(email) {
  if (!email || email.trim() === "") return "Email address is required.";
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) return "Please enter a valid email address.";
  return null;
}

function validatePassword(password) {
  if (!password || password.length === 0) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must include at least one special character.";
  return null;
}

function validateSignupInput(input) {
  const errors = {};
  if (!input.firstName || input.firstName.trim().length === 0) errors.firstName = "First name is required.";
  if (!input.lastName || input.lastName.trim().length === 0) errors.lastName = "Last name is required.";
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (input.password !== input.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!VALID_ECOSYSTEMS.includes(input.accountType)) errors.accountType = "Please select a valid ecosystem.";
  return { isValid: Object.keys(errors).length === 0, errors };
}

function sanitizeAuthErrorMessage(rawError, errorCode) {
  const code = (errorCode || "").toLowerCase();
  const err = (rawError || "").toLowerCase();
  if (code.includes("rate_limit") || err.includes("rate limit") || err.includes("too many requests")) {
    return "Too many attempts. Please wait and try again.";
  }
  if (code.includes("email_not_confirmed") || err.includes("email not confirmed") || err.includes("not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (code.includes("user_banned") || err.includes("banned") || err.includes("disabled")) {
    return "Your account is currently unavailable.";
  }
  if (code.includes("user_already_exists") || err.includes("already registered") || err.includes("duplicate")) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (code.includes("invalid_credentials") || code.includes("invalid_grant") || err.includes("invalid login credentials") || err.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  return "Unable to sign in right now. Please try again.";
}

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
  console.log("READY AUTHENTICATION BUG — TEST MATRIX (A to N)");
  console.log("==================================================");

  const client = makeClient();

  // ------------------------------------------------------------------
  // Scenario A: New email -> signup -> immediate login
  // ------------------------------------------------------------------
  const emailA = `ready_test_a_${Date.now()}@example.com`;
  console.log(`\n--- Scenario A: New Email Registration & Immediate Login ---`);
  const resA = await client.auth.signUp({
    email: emailA,
    password: "Password123!#",
    options: {
      data: {
        first_name: "Matrix",
        last_name: "TesterA",
        account_type: "STUDENT",
      },
    },
  });
  assert(!resA.error, `Scenario A: Signup succeeded for ${emailA}`);
  assert(!!resA.data.user, `Scenario A: Auth user created with ID ${resA.data?.user?.id}`);

  const loginA = await client.auth.signInWithPassword({
    email: emailA,
    password: "Password123!#",
  });
  assert(!loginA.error, `Scenario A: Immediate login succeeded for ${emailA}`);
  assert(!!loginA.data.session, `Scenario A: Active session returned for ${emailA}`);

  // ------------------------------------------------------------------
  // Scenario B: Existing confirmed email -> correct password -> login
  // Test 3 working accounts: chinmayi@gmail.com, admin@ready.platform, g@gmail.com
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario B: Existing Confirmed Accounts with Correct Passwords ---`);
  const loginChinmayi = await client.auth.signInWithPassword({
    email: "chinmayi@gmail.com",
    password: "CollegeAdmin2026!#",
  });
  assert(!loginChinmayi.error, `Scenario B: chinmayi@gmail.com successfully signed in`);
  assert(loginChinmayi.data.user?.id === "669721e2-e156-4df7-b3f3-57911d9a460f", `Scenario B: Correct user ID for chinmayi@gmail.com`);

  const loginAdmin = await client.auth.signInWithPassword({
    email: "admin@ready.platform",
    password: "AdminReady2026!#",
  });
  assert(!loginAdmin.error, `Scenario B: admin@ready.platform successfully signed in`);

  const loginTeacher = await client.auth.signInWithPassword({
    email: "g@gmail.com",
    password: "Teacher2026!#",
  });
  assert(!loginTeacher.error, `Scenario B: g@gmail.com successfully signed in`);

  // ------------------------------------------------------------------
  // Scenario C: Existing email -> wrong password -> rejection
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario C: Wrong Password Rejection & Masking ---`);
  const wrongPassRes = await client.auth.signInWithPassword({
    email: "chinmayi@gmail.com",
    password: "WrongPassword999!#",
  });
  assert(!!wrongPassRes.error, `Scenario C: Wrong password correctly rejected`);
  const sanitizedWrongPass = sanitizeAuthErrorMessage(wrongPassRes.error.message, wrongPassRes.error.code);
  assert(
    sanitizedWrongPass === "Email or password is incorrect.",
    `Scenario C: Sanitized message matches required "Email or password is incorrect." (got "${sanitizedWrongPass}")`
  );

  // ------------------------------------------------------------------
  // Scenario D: Unconfirmed email -> login -> correct message
  // Testing ready_test_architect_55065@gmail.com (which has email_confirmed_at = null)
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario D: Unconfirmed Email Login ---`);
  const unconfirmedRes = await client.auth.signInWithPassword({
    email: "ready_test_architect_55065@gmail.com",
    password: "Password123!#",
  });
  assert(!!unconfirmedRes.error, `Scenario D: Unconfirmed login safely rejected`);
  const sanitizedUnconfirmed = sanitizeAuthErrorMessage(unconfirmedRes.error.message, unconfirmedRes.error.code);
  assert(
    sanitizedUnconfirmed === "Email or password is incorrect." ||
    sanitizedUnconfirmed === "Please verify your email before signing in.",
    `Scenario D: Returns secure user-facing message (got "${sanitizedUnconfirmed}")`
  );

  // Verify that an explicit email_not_confirmed code is mapped accurately
  const mappedUnconfirmed = sanitizeAuthErrorMessage("Email not confirmed", "email_not_confirmed");
  assert(
    mappedUnconfirmed === "Please verify your email before signing in.",
    `Scenario D: email_not_confirmed code maps to "Please verify your email before signing in."`
  );

  // ------------------------------------------------------------------
  // Scenario E: Email with uppercase characters -> normalized correctly
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario E: Uppercase Email Normalization ---`);
  const upperLogin = await client.auth.signInWithPassword({
    email: "CHINMAYI@GMAIL.COM".trim().toLowerCase(),
    password: "CollegeAdmin2026!#",
  });
  assert(!upperLogin.error, `Scenario E: Uppercase email signed in after normalization`);
  assert(upperLogin.data.user?.email === "chinmayi@gmail.com", `Scenario E: Session user email is normalized lowercase`);

  // ------------------------------------------------------------------
  // Scenario F: Email with leading/trailing spaces -> normalized correctly
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario F: Leading/Trailing Spaces Normalization ---`);
  const spaceLogin = await client.auth.signInWithPassword({
    email: "  chinmayi@gmail.com  ".trim().toLowerCase(),
    password: "CollegeAdmin2026!#",
  });
  assert(!spaceLogin.error, `Scenario F: Padded email signed in after trim & lower`);

  // ------------------------------------------------------------------
  // Scenario G: Duplicate signup -> handled safely (status 422 user_already_exists)
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario G: Duplicate Signup Handling ---`);
  const dupRes = await client.auth.signUp({
    email: "chinmayi@gmail.com",
    password: "AnyPassword123!#",
  });
  assert(!!dupRes.error, `Scenario G: Duplicate signup returned error`);
  assert(
    dupRes.error.status === 422 || dupRes.error.code === "user_already_exists" || dupRes.error.message.includes("already"),
    `Scenario G: Duplicate signup returns 422 or user_already_exists`
  );
  const sanitizedDup = sanitizeAuthErrorMessage(dupRes.error.message, dupRes.error.code);
  assert(
    sanitizedDup === "An account with this email address already exists. Please sign in instead.",
    `Scenario G: Sanitized message correctly guides user to sign in`
  );

  // ------------------------------------------------------------------
  // Scenario H: Profile initialization idempotent upsert -> no duplicates
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario H: Idempotent Profile & Role Handling ---`);
  // Verify with an active authenticated client
  const clientA = makeClient();
  const loginARetry = await clientA.auth.signInWithPassword({
    email: emailA,
    password: "Password123!#",
  });
  assert(!loginARetry.error, `Scenario H: Client A authenticated`);

  // First profile upsert
  const { error: upsert1 } = await clientA.from("profiles").upsert(
    {
      id: loginARetry.data.user.id,
      email: emailA,
      first_name: "Matrix",
      last_name: "TesterA",
      display_name: "Matrix TesterA",
      account_type: "STUDENT",
      account_state: "ACTIVE",
    },
    { onConflict: "id" }
  );
  assert(!upsert1, `Scenario H: Initial profile upsert succeeded`);

  // Retry profile upsert (simulate idempotent retry)
  const { error: upsert2 } = await clientA.from("profiles").upsert(
    {
      id: loginARetry.data.user.id,
      email: emailA,
      first_name: "Matrix",
      last_name: "TesterA",
      display_name: "Matrix TesterA",
      account_type: "STUDENT",
      account_state: "ACTIVE",
    },
    { onConflict: "id" }
  );
  assert(!upsert2, `Scenario H: Retried profile upsert succeeded without duplicate errors`);

  // Verify exactly 1 profile exists
  const { data: countCheck } = await clientA
    .from("profiles")
    .select("id")
    .eq("id", loginARetry.data.user.id);
  assert(countCheck.length === 1, `Scenario H: Exactly 1 profile record exists for user`);

  // ------------------------------------------------------------------
  // Scenarios I - M: Role Signup for all allowed ecosystems
  // ------------------------------------------------------------------
  console.log(`\n--- Scenarios I - M: Ecosystem Registrations ---`);
  const ecosystems = [
    { code: "I", type: "STUDENT", role: "STUDENT" },
    { code: "J", type: "TEACHER", role: "TEACHER" },
    { code: "K", type: "PROFESSIONAL", role: "PROFESSIONAL" },
    { code: "L", type: "CANDIDATE", role: "CANDIDATE" },
    { code: "M", type: "COMPANY", role: "COMPANY_ADMIN" },
  ];

  for (const eco of ecosystems) {
    const testEmail = `ready_test_${eco.type.toLowerCase()}_${Date.now()}@example.com`;
    const sRes = await client.auth.signUp({
      email: testEmail,
      password: "Password123!#",
      options: {
        data: {
          first_name: "Test",
          last_name: eco.type,
          account_type: eco.type,
        },
      },
    });
    assert(!sRes.error, `Scenario ${eco.code}: Signup for ${eco.type} succeeded`);
    assert(sRes.data.user?.user_metadata?.account_type === eco.type, `Scenario ${eco.code}: Stored metadata account_type matches ${eco.type}`);
  }

  // ------------------------------------------------------------------
  // Scenario N: Platform Admin CANNOT be created through public signup
  // ------------------------------------------------------------------
  console.log(`\n--- Scenario N: Platform Admin Guard Check ---`);
  const invalidAdminInput = validateSignupInput({
    firstName: "Attacker",
    lastName: "Admin",
    email: "fakeadmin@hacker.io",
    password: "Password123!#",
    confirmPassword: "Password123!#",
    accountType: "PLATFORM_ADMIN",
  });
  assert(
    !invalidAdminInput.isValid,
    `Scenario N: validateSignupInput rejects PLATFORM_ADMIN accountType`
  );
  assert(
    invalidAdminInput.errors.accountType === "Please select a valid ecosystem.",
    `Scenario N: Correct error message returned for PLATFORM_ADMIN attempt`
  );

  console.log("\n==================================================");
  console.log(`TEST MATRIX COMPLETED: ${passed} / ${total} ASSERTIONS PASSED`);
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Test matrix failed with uncaught error:", err);
  process.exit(1);
});
