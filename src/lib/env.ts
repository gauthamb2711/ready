/**
 * READY Platform - Central Environment Variable Validation
 * Validates required environment variables with sanitized developer-friendly messages.
 * Prevents silent runtime failures when running locally in VS Code or production.
 */

export interface AppEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
}

export function validateEnv(): AppEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const missing: string[] = [];

  if (!supabaseUrl || supabaseUrl.trim() === "") {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  } else if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
    throw new Error(
      `[READY Env Error] NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL (got "${supabaseUrl.substring(0, 8)}...").`
    );
  }

  if (!supabaseKey || supabaseKey.trim() === "") {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `[READY Env Error] Missing required environment variable(s): ${missing.join(", ")}.\n` +
      `Please ensure your .env.local file exists and is populated based on .env.example.`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.trim(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey.trim(),
    NEXT_PUBLIC_APP_URL: appUrl.trim(),
  };
}

export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
