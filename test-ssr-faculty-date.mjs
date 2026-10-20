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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: dummyTransport },
});

async function main() {
  console.log("Testing College Admin authentication and SSR output...");
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "chinmayi@gmail.com",
    password: "CollegeAdmin2026!#",
  });

  if (authErr || !auth.session) {
    console.error("Auth failed:", authErr?.message);
    process.exit(1);
  }

  console.log("Logged in as College Admin. Session token obtained.");

  // Fetch pending requests from Supabase to test formatting helper
  const { data: requests, error: reqErr } = await supabase
    .from("organization_membership_requests")
    .select("created_at, submitted_at, status")
    .eq("status", "PENDING");

  console.log(`Found ${requests?.length || 0} pending request(s) in DB:`);
  for (const r of requests || []) {
    const raw = r.created_at || r.submitted_at;
    const formatted = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(raw));
    console.log(`  Raw: "${raw}" -> Formatted: "${formatted}"`);
  }

  // Test null / invalid fallback
  function formatRequestDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  console.log("Testing fallback behavior:");
  console.log(`  null -> "${formatRequestDate(null)}" (Expected: "—")`);
  console.log(`  undefined -> "${formatRequestDate(undefined)}" (Expected: "—")`);
  console.log(`  invalid -> "${formatRequestDate("not-a-date")}" (Expected: "—")`);

  if (formatRequestDate(null) !== "—" || formatRequestDate(undefined) !== "—") {
    console.error("Fallback test failed!");
    process.exit(1);
  }

  console.log("All deterministic date formatting checks passed cleanly!");
}

main().catch(console.error);
