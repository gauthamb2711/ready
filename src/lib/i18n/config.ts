export interface SupportedCountry {
  code: string;
  name: string;
  defaultCurrency: string;
  defaultTimezone: string;
  gradingSystemDefault: "GPA_4" | "PERCENTAGE_100" | "LETTER_GRADE" | "CREDIT_POINTS";
}

export const SUPPORTED_COUNTRIES: Record<string, SupportedCountry> = {
  US: {
    code: "US",
    name: "United States",
    defaultCurrency: "USD",
    defaultTimezone: "America/New_York",
    gradingSystemDefault: "GPA_4",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    defaultCurrency: "GBP",
    defaultTimezone: "Europe/London",
    gradingSystemDefault: "LETTER_GRADE",
  },
  IN: {
    code: "IN",
    name: "India",
    defaultCurrency: "INR",
    defaultTimezone: "Asia/Kolkata",
    gradingSystemDefault: "PERCENTAGE_100",
  },
  DE: {
    code: "DE",
    name: "Germany",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Berlin",
    gradingSystemDefault: "GPA_4",
  },
  SG: {
    code: "SG",
    name: "Singapore",
    defaultCurrency: "SGD",
    defaultTimezone: "Asia/Singapore",
    gradingSystemDefault: "GPA_4",
  },
  AU: {
    code: "AU",
    name: "Australia",
    defaultCurrency: "AUD",
    defaultTimezone: "Australia/Sydney",
    gradingSystemDefault: "LETTER_GRADE",
  },
};

export const SUPPORTED_LOCALES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Español" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
  { code: "ja-JP", label: "日本語" },
];

export const GRADING_SYSTEMS = {
  GPA_4: { name: "4.0 Grade Point Average", scaleMax: 4.0, passThreshold: 2.0 },
  PERCENTAGE_100: { name: "Percentage (0-100%)", scaleMax: 100, passThreshold: 40 },
  LETTER_GRADE: { name: "Letter Grades (A+ to F)", scaleMax: 100, passThreshold: 50 },
  CREDIT_POINTS: { name: "ECTS / Modular Credit System", scaleMax: 60, passThreshold: 30 },
};

export function getGlobalContext(countryCode = "US") {
  return SUPPORTED_COUNTRIES[countryCode] || SUPPORTED_COUNTRIES.US;
}
