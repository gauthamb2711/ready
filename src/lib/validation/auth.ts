import type { AccountType } from "@/types/database.types";

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const VALID_ECOSYSTEMS: AccountType[] = [
  "STUDENT",
  "CANDIDATE",
  "PROFESSIONAL",
  "TEACHER",
  "COLLEGE_UNIVERSITY",
  "COMPANY",
];

export function validateEmail(email: string): string | null {
  if (!email || email.trim() === "") {
    return "Email address is required.";
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length === 0) {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must include at least one special character.";
  }
  return null;
}

export function validateSignupInput(input: SignupInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.firstName || input.firstName.trim().length === 0) {
    errors.firstName = "First name is required.";
  }

  if (!input.lastName || input.lastName.trim().length === 0) {
    errors.lastName = "Last name is required.";
  }

  const emailError = validateEmail(input.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!VALID_ECOSYSTEMS.includes(input.accountType)) {
    errors.accountType = "Please select a valid ecosystem.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeAuthErrorMessage(rawError: string, errorCode?: string): string {
  const code = (errorCode || "").toLowerCase();
  const err = (rawError || "").toLowerCase();

  // Rate limited
  if (
    code.includes("rate_limit") ||
    code.includes("over_request_rate_limit") ||
    code.includes("over_email_send_rate_limit") ||
    err.includes("rate limit") ||
    err.includes("too many requests")
  ) {
    return "Too many attempts. Please wait and try again.";
  }

  // Email not confirmed
  if (
    code.includes("email_not_confirmed") ||
    err.includes("email not confirmed") ||
    err.includes("not confirmed") ||
    err.includes("not verified")
  ) {
    return "Please verify your email before signing in.";
  }

  // Account banned / suspended
  if (
    code.includes("user_banned") ||
    code.includes("account_suspended") ||
    code.includes("user_disabled") ||
    err.includes("banned") ||
    err.includes("suspended") ||
    err.includes("disabled") ||
    err.includes("deactivated")
  ) {
    return "Your account is currently unavailable.";
  }

  // Provider-only account (SSO / social sign-in without password)
  if (
    code.includes("provider_email_needs_verification") ||
    code.includes("external_provider") ||
    err.includes("different provider") ||
    err.includes("different sign-in method") ||
    err.includes("oauth") ||
    err.includes("sso") ||
    err.includes("social sign-in")
  ) {
    return "This account uses a different sign-in method.";
  }

  // Already registered / duplicate signup
  if (
    code.includes("user_already_exists") ||
    err.includes("already registered") ||
    err.includes("user already exists") ||
    err.includes("duplicate")
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }

  // Invalid credentials: map wrong password, invalid_credentials, invalid_grant, and nonexistent user
  // to avoid user enumeration
  if (
    code.includes("invalid_credentials") ||
    code.includes("invalid_grant") ||
    err.includes("invalid login credentials") ||
    err.includes("invalid credentials") ||
    err.includes("invalid password") ||
    err.includes("invalid email") ||
    err.includes("user not found") ||
    err.includes("no user")
  ) {
    return "Email or password is incorrect.";
  }

  // Unknown auth failure
  return "Unable to sign in right now. Please try again.";
}
