"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Briefcase,
  Award,
  BookOpen,
  Building2,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { ACCOUNT_TYPES } from "@/lib/rbac/roles";
import { SUPPORTED_COUNTRIES, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import type { AccountType, Profile, UserRoleRecord } from "@/types/database.types";

interface OnboardingWizardProps {
  initialProfile: Profile;
  roles: UserRoleRecord[];
}

export function OnboardingWizard({ initialProfile, roles }: OnboardingWizardProps) {
  const router = useRouter();

  // Wizard State (Steps 1 to 5)
  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form State
  const [selectedEcosystem, setSelectedEcosystem] = React.useState<AccountType>(
    initialProfile.account_type || "STUDENT"
  );
  const [displayName, setDisplayName] = React.useState<string>(
    initialProfile.display_name ||
      `${initialProfile.first_name || ""} ${initialProfile.last_name || ""}`.trim() ||
      "Learner"
  );
  const [countryCode, setCountryCode] = React.useState<string>(
    initialProfile.country_code || "US"
  );
  const [locale, setLocale] = React.useState<string>(
    initialProfile.locale || "en-US"
  );

  // Verification request fields for privileged accounts
  const [orgName, setOrgName] = React.useState<string>("");
  const [workEmail, setWorkEmail] = React.useState<string>(initialProfile.email || "");
  const [verificationNotes, setVerificationNotes] = React.useState<string>("");

  const isPrivileged = ["TEACHER", "COLLEGE_UNIVERSITY", "COMPANY"].includes(selectedEcosystem);

  const ecosystemsList: Array<{
    type: AccountType;
    name: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    privileged: boolean;
  }> = [
    {
      type: "STUDENT",
      name: "Student",
      desc: "Personalized capability, adaptive learning plans, and private retention notes.",
      icon: GraduationCap,
      privileged: false,
    },
    {
      type: "CANDIDATE",
      name: "Candidate",
      desc: "Standardized benchmarking, verified skill credentials, and hiring profiles.",
      icon: Briefcase,
      privileged: false,
    },
    {
      type: "PROFESSIONAL",
      name: "Professional",
      desc: "Targeted capability upgrades and continuous skill retention tracking.",
      icon: Award,
      privileged: false,
    },
    {
      type: "TEACHER",
      name: "Teacher / Faculty",
      desc: "Curriculum authoring, question banks, and cohort assessment evaluation.",
      icon: BookOpen,
      privileged: true,
    },
    {
      type: "COLLEGE_UNIVERSITY",
      name: "College / University",
      desc: "Institutional multi-tenant management, department programs, and accreditation.",
      icon: Building2,
      privileged: true,
    },
    {
      type: "COMPANY",
      name: "Company / Organization",
      desc: "Workforce upskilling pipelines, hiring benchmarks, and talent discovery.",
      icon: Building,
      privileged: true,
    },
  ];

  // Finalize Onboarding & Save Profile
  const handleComplete = async () => {
    setSaving(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const calculatedState = isPrivileged ? "PENDING" : "ACTIVE";

      // 1. Update Profile with onboarding completed flag
      const profileUpdates = {
        display_name: displayName.trim(),
        account_type: selectedEcosystem,
        account_state: calculatedState,
        country_code: countryCode,
        locale: locale,
        metadata: {
          ...(initialProfile.metadata || {}),
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        },
      };

      const { error: profileError } = await (supabase.from("profiles") as any)
        .upsert(
          {
            id: initialProfile.id,
            email: initialProfile.email || "",
            ...profileUpdates,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        throw new Error(profileError.message);
      }

      // 2. If privileged, record verification request
      if (isPrivileged) {
        const { error: verReqError } = await (supabase.from("verification_requests") as any).insert({
          user_id: initialProfile.id,
          target_ecosystem: selectedEcosystem,
          status: "PENDING",
          organization_name: orgName.trim() || null,
          work_email: workEmail.trim() || null,
          notes: verificationNotes.trim() || null,
        });

        if (verReqError) {
          console.warn("[OnboardingWizard] Failed to record verification_requests:", verReqError.message);
        }

        // If college or company, also populate organization registry and verification tables
        if ((selectedEcosystem === "COLLEGE_UNIVERSITY" || selectedEcosystem === "COMPANY") && orgName.trim()) {
          const rawSlug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const slug = `${rawSlug}-${Math.random().toString(36).substring(2, 6)}`;
          const { data: newOrg, error: orgError } = await (supabase.from("organizations") as any)
            .insert({
              name: orgName.trim(),
              slug,
              type: selectedEcosystem === "COMPANY" ? "COMPANY" : "COLLEGE_UNIVERSITY",
              verified: false,
              verification_status: "PENDING",
              created_by: initialProfile.id,
              settings: {
                official_email: workEmail.trim() || null,
                notes: verificationNotes.trim() || null,
              },
            })
            .select()
            .maybeSingle();

          if (orgError) {
            console.warn("[OnboardingWizard] Failed to record organization:", orgError.message);
          }

          if (newOrg?.id) {
            const { error: orgVerifError } = await (supabase.from("organization_verifications") as any)
              .insert({
                organization_id: newOrg.id,
                submitted_by: initialProfile.id,
                official_email: workEmail.trim() || initialProfile.email || "",
                status: "PENDING",
                review_notes: verificationNotes.trim() || "Organization registration awaiting Platform Admin review",
              });

            if (orgVerifError) {
              console.warn("[OnboardingWizard] Failed to record organization_verifications:", orgVerifError.message);
            }

            const { error: orgMemberError } = await (supabase.from("organization_members") as any)
              .insert({
                organization_id: newOrg.id,
                user_id: initialProfile.id,
                role: "COLLEGE_ADMIN",
                status: "INVITED",
              });

            if (orgMemberError) {
              console.warn("[OnboardingWizard] Failed to record organization_members:", orgMemberError.message);
            }
          }
        }
      }

      // 3. Redirect to appropriate workspace
      const targetPath = ACCOUNT_TYPES[selectedEcosystem]?.defaultPath || "/student";
      router.push(targetPath);
      router.refresh();
    } catch (err: unknown) {
      console.error("Onboarding completion error:", err);
      setErrorMsg("Failed to save onboarding settings. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Step {currentStep} of 5
          </span>
          <h2 className="text-lg font-bold text-white">
            {currentStep === 1 && "Welcome to READY"}
            {currentStep === 2 && "Confirm Your Ecosystem"}
            {currentStep === 3 && "Profile Information"}
            {currentStep === 4 && "Account Status & Verification"}
            {currentStep === 5 && "Enter Your Workspace"}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((stepNum) => (
            <div
              key={stepNum}
              className={`h-2 rounded-full transition-all duration-300 ${
                stepNum === currentStep
                  ? "w-8 bg-indigo-500"
                  : stepNum < currentStep
                  ? "w-2 bg-emerald-500"
                  : "w-2 bg-slate-800"
              }`}
            />
          ))}
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* STEP 1: Welcome */}
      {currentStep === 1 && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 mb-2 border border-indigo-500/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl text-white">
              Global Learning, Assessment & Skill Verification
            </CardTitle>
            <CardDescription className="text-slate-300 text-sm leading-relaxed">
              READY is built around a closed-loop capability architecture. We help individuals and institutions diagnose current proficiency, close identified gaps, and guarantee retained capability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>The Core Capability Loop</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                <span className="rounded bg-slate-900 px-2.5 py-1 text-slate-200 border border-slate-800">
                  Current Capability
                </span>
                <span>&rarr;</span>
                <span className="rounded bg-slate-900 px-2.5 py-1 text-slate-200 border border-slate-800">
                  Target Capability
                </span>
                <span>&rarr;</span>
                <span className="rounded bg-slate-900 px-2.5 py-1 text-slate-200 border border-slate-800">
                  Gap
                </span>
                <span>&rarr;</span>
                <span className="rounded bg-slate-900 px-2.5 py-1 text-slate-200 border border-slate-800">
                  Plan
                </span>
                <span>&rarr;</span>
                <span className="rounded bg-slate-900 px-2.5 py-1 text-slate-200 border border-slate-800">
                  Action
                </span>
                <span>&rarr;</span>
                <span className="rounded bg-slate-900 px-2.5 py-1 text-slate-200 border border-slate-800">
                  Assessment
                </span>
                <span>&rarr;</span>
                <span className="rounded bg-indigo-950 px-2.5 py-1 text-indigo-300 border border-indigo-800 font-semibold">
                  Verified Capability
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              In this quick onboarding session, we will configure your user profile, verify your ecosystem authorization, and guide you to your workspace.
            </p>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="primary" onClick={() => setCurrentStep(2)} className="gap-2">
              <span>Begin Configuration</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: Confirm Ecosystem */}
      {currentStep === 2 && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl text-white">Select or Confirm Ecosystem</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Each ecosystem provides a dedicated workspace with tailored capability verification tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ecosystemsList.map((eco) => {
                const Icon = eco.icon;
                const isSelected = selectedEcosystem === eco.type;

                return (
                  <div
                    key={eco.type}
                    onClick={() => setSelectedEcosystem(eco.type)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/30 shadow-md shadow-indigo-500/10"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-white">{eco.name}</span>
                      </div>
                      {eco.privileged && (
                        <Badge variant="outline" className="text-[10px]">
                          Verification Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{eco.desc}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCurrentStep(3)}>
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: Basic Profile Information */}
      {currentStep === 3 && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl text-white">Profile & Regional Settings</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Provide basic profile details and regional formatting preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="onboarding-display-name"
              label="Display Name"
              placeholder="Your full name or title"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                id="onboarding-country"
                label="Country / Region"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {Object.values(SUPPORTED_COUNTRIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.defaultCurrency})
                  </option>
                ))}
              </Select>

              <Select
                id="onboarding-locale"
                label="Preferred Language / Locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                {SUPPORTED_LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCurrentStep(4)}>
              Review Status <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: Account Status & Verification Notice */}
      {currentStep === 4 && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl text-white">Account Status & Verification</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Review your ecosystem verification requirements before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isPrivileged ? (
              <div className="space-y-4">
                {/* Explicit Verification Required Notice */}
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-5 space-y-3">
                  <div className="flex items-center gap-2.5 text-amber-300 font-bold text-base">
                    <ShieldAlert className="h-5 w-5" />
                    <span>Verification required</span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                    Your account is pending verification. Privileged organization features will become available after verification.
                  </p>
                  <p className="text-[11px] text-amber-300/70">
                    To prevent unauthorized organizational access, selecting {ACCOUNT_TYPES[selectedEcosystem]?.label} establishes your affiliation request. While in the <strong>PENDING</strong> state, you can explore the workspace layout, but privileged features (publishing assessments, grading cohorts, or tenant configuration) remain strictly protected.
                  </p>
                </div>

                {/* Verification Request Input */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Institutional Affiliation Request
                  </h4>
                  <Input
                    id="verification-org-name"
                    label="Organization / University Name"
                    placeholder="e.g. Stanford University / TechCorp Global"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                  <Input
                    id="verification-work-email"
                    label="Institutional Email (if different)"
                    placeholder="faculty@stanford.edu"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5 space-y-2">
                <div className="flex items-center gap-2.5 text-emerald-300 font-bold text-base">
                  <ShieldCheck className="h-5 w-5" />
                  <span>Account State: Active</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  Your account is ready for full access. As a {selectedEcosystem}, you can start baseline diagnostic assessments, create personalized learning plans, and save private notes immediately.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(3)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCurrentStep(5)}>
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 5: Continue to Workspace */}
      {currentStep === 5 && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 mb-2 border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl text-white">Onboarding Complete</CardTitle>
            <CardDescription className="text-slate-300 text-xs leading-relaxed">
              Your profile is configured. You are ready to enter your designated workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Ecosystem</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {ACCOUNT_TYPES[selectedEcosystem]?.label}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Initial State</span>
                <span className={`font-semibold mt-0.5 block ${isPrivileged ? "text-amber-400" : "text-emerald-400"}`}>
                  {isPrivileged ? "PENDING VERIFICATION" : "ACTIVE"}
                </span>
              </div>
            </div>

            {isPrivileged && (
              <p className="text-xs text-amber-300/80 bg-amber-950/20 p-3 rounded-lg border border-amber-900/40">
                Reminder: Privileged organization actions will become available once institutional verification is approved.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={saving}
              onClick={handleComplete}
              className="gap-2"
            >
              <span>Enter {ACCOUNT_TYPES[selectedEcosystem]?.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
