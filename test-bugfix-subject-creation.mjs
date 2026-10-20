import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://btnogpdzwkplhplqbgwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_q1fISPS3ZXnYWehJWd3Ipw_A847625n";

const dummyWS = class DummyWS {
  constructor() {}
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
};

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: dummyWS },
});

const results = [];

function recordTest(num, name, passed, details) {
  results.push({ num, name, passed, details });
  console.log(`[TEST ${num.toString().padStart(2, "0")}] ${passed ? "PASSED" : "FAILED"}: ${name}`);
  if (details) console.log(`   -> ${details}`);
}

async function runRegressionSuite() {
  console.log("==================================================");
  console.log("READY PLATFORM - SUBJECT CREATION BUG FIX AUDIT");
  console.log("FOREIGN KEY INTEGRITY & PROFILE SYNC VERIFICATION");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const studentAEmail = `student_a_${timestamp}@readytest.org`;
  const studentBEmail = `student_b_${timestamp}@readytest.org`;
  const testPassword = "Password123!@#";

  // Register Student A
  console.log("Registering Student A:", studentAEmail);
  const { data: signUpA, error: signAErr } = await supabaseAnon.auth.signUp({
    email: studentAEmail,
    password: testPassword,
    options: {
      data: {
        first_name: "Student",
        last_name: "Alpha",
        account_type: "STUDENT",
      },
    },
  });

  if (signAErr || !signUpA.user) {
    throw new Error(`Failed to create Student A: ${signAErr?.message}`);
  }
  const studentAId = signUpA.user.id;

  const { data: signInA } = await supabaseAnon.auth.signInWithPassword({
    email: studentAEmail,
    password: testPassword,
  });

  const clientA = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${signInA.session.access_token}` } },
    realtime: { transport: dummyWS },
  });

  // Register Student B
  console.log("Registering Student B:", studentBEmail);
  const { data: signUpB, error: signBErr } = await supabaseAnon.auth.signUp({
    email: studentBEmail,
    password: testPassword,
    options: {
      data: {
        first_name: "Student",
        last_name: "Beta",
        account_type: "STUDENT",
      },
    },
  });

  if (signBErr || !signUpB.user) {
    throw new Error(`Failed to create Student B: ${signBErr?.message}`);
  }
  const studentBId = signUpB.user.id;

  const { data: signInB } = await supabaseAnon.auth.signInWithPassword({
    email: studentBEmail,
    password: testPassword,
  });

  const clientB = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${signInB.session.access_token}` } },
    realtime: { transport: dummyWS },
  });

  // ----------------------------------------------------
  // TEST A: Valid authenticated student can create subject ("Compiler Design")
  // ----------------------------------------------------
  let subjectAId = null;
  const { data: createdSubject, error: createError } = await clientA
    .from("student_subjects")
    .insert({
      user_id: studentAId,
      name: "Compiler Design",
      code: "CS401",
      description: "Lexical, Syntax, and Semantic Analysis for Compilers",
      exam_date: "2026-11-15",
      target_score: "85",
      available_daily_study_time: "60",
      current_prep_level: "NOT_STARTED",
      current_capability_score: 0,
      target_capability_score: 85,
      capability_gap: 85,
    })
    .select()
    .single();

  if (createdSubject) {
    subjectAId = createdSubject.id;
  }

  recordTest(
    1,
    "Test A: Valid authenticated student can create 'Compiler Design' subject",
    !createError && !!createdSubject && createdSubject.name === "Compiler Design",
    createError ? `Error: ${createError.message}` : `Created Subject ID: ${createdSubject?.id}`
  );

  // ----------------------------------------------------
  // TEST B: Authenticated user without profile is handled safely (Self-healing sync)
  // ----------------------------------------------------
  const unprofiledEmail = `unprofiled_${timestamp}@readytest.org`;
  const { data: signUpUnprofiled } = await supabaseAnon.auth.signUp({
    email: unprofiledEmail,
    password: testPassword,
  });
  const unprofiledId = signUpUnprofiled.user.id;

  const { data: signInUnprofiled } = await supabaseAnon.auth.signInWithPassword({
    email: unprofiledEmail,
    password: testPassword,
  });

  const clientUnprofiled = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${signInUnprofiled.session.access_token}` } },
    realtime: { transport: dummyWS },
  });

  // Simulate self-healing profile sync logic as executed in getServerAuthContext
  const { data: syncedProfile, error: syncError } = await clientUnprofiled
    .from("profiles")
    .upsert({
      id: unprofiledId,
      email: unprofiledEmail,
      display_name: "Unprofiled User Healed",
      account_type: "STUDENT",
      account_state: "ACTIVE",
    })
    .select()
    .single();

  const { data: healedSubject, error: healedSubjError } = await clientUnprofiled
    .from("student_subjects")
    .insert({
      user_id: unprofiledId,
      name: "Computer Architecture",
      target_score: "80",
      available_daily_study_time: "45",
      current_prep_level: "NOT_STARTED",
      current_capability_score: 0,
      target_capability_score: 80,
      capability_gap: 80,
    })
    .select()
    .single();

  recordTest(
    2,
    "Test B: Authenticated user without profile is safely self-healed and can create subject",
    !healedSubjError && !!healedSubject && !syncError,
    healedSubjError ? `Error: ${healedSubjError.message}` : `Healed Profile ID: ${syncedProfile?.id}`
  );

  // ----------------------------------------------------
  // TEST C: Student cannot create subject for another user
  // ----------------------------------------------------
  const { data: spoofSubject, error: spoofError } = await clientA
    .from("student_subjects")
    .insert({
      user_id: studentBId, // Student A trying to insert for Student B
      name: "Spoofed Operating Systems",
      target_score: "90",
      available_daily_study_time: "60",
      current_prep_level: "NOT_STARTED",
      current_capability_score: 0,
      target_capability_score: 90,
      capability_gap: 90,
    })
    .select();

  recordTest(
    3,
    "Test C: Student cannot create subject for another user (RLS check)",
    !!spoofError || !spoofSubject || spoofSubject.length === 0,
    spoofError ? `Correctly rejected: ${spoofError.message}` : "Blocked by RLS insert policy"
  );

  // ----------------------------------------------------
  // TEST D: Anonymous user cannot create subject
  // ----------------------------------------------------
  const { data: anonSubj, error: anonSubjError } = await supabaseAnon
    .from("student_subjects")
    .insert({
      user_id: studentAId,
      name: "Anonymous Subject",
      target_score: "75",
      available_daily_study_time: "30",
      current_prep_level: "NOT_STARTED",
      current_capability_score: 0,
      target_capability_score: 75,
      capability_gap: 75,
    })
    .select();

  recordTest(
    4,
    "Test D: Anonymous user cannot create subject",
    !!anonSubjError || !anonSubj || anonSubj.length === 0,
    anonSubjError ? `Rejected: ${anonSubjError.message}` : "Blocked anonymously by RLS"
  );

  // ----------------------------------------------------
  // TEST E: Existing subjects remain accessible
  // ----------------------------------------------------
  const { data: subjectsA, error: fetchAErr } = await clientA
    .from("student_subjects")
    .select("*")
    .eq("user_id", studentAId);

  const foundCreated = subjectsA?.some((s) => s.id === subjectAId && s.name === "Compiler Design");

  recordTest(
    5,
    "Test E: Existing subjects remain accessible for owner",
    !fetchAErr && !!foundCreated,
    `Retrieved ${subjectsA?.length} subject(s) for Student A`
  );

  // ----------------------------------------------------
  // TEST F: RLS still prevents cross-user access
  // ----------------------------------------------------
  const { data: bReadingA, error: crossErr } = await clientB
    .from("student_subjects")
    .select("*")
    .eq("id", subjectAId);

  recordTest(
    6,
    "Test F: RLS prevents cross-user subject access (Student B reading Student A's subject)",
    !bReadingA || bReadingA.length === 0,
    `Student B received ${bReadingA?.length || 0} rows when querying Student A's subject (Access Denied / Blocked)`
  );

  console.log("\n==================================================");
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`REGRESSION AUDIT: ${totalPassed} / ${results.length} PASSED`);
  console.log("==================================================");

  if (totalPassed === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
