"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Clock, Building2, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import type { Profile, VerificationRequest } from "@/types/database.types";

interface Props {
  profile: Profile | null;
  isVerified: boolean;
  initialRequests: VerificationRequest[];
}

export function TeacherVerificationView({ profile, isVerified, initialRequests }: Props) {
  const [requests, setRequests] = React.useState<VerificationRequest[]>(initialRequests);
  const [organizationName, setOrganizationName] = React.useState("");
  const [workEmail, setWorkEmail] = React.useState(profile?.email || "");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const accountState = profile?.account_state || "PENDING";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/teacher/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName,
          workEmail,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit verification request");
      }

      setSuccessMsg("Verification request submitted successfully! Academic reviewers will examine your affiliation.");
      if (data.request) {
        setRequests([data.request, ...requests]);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Teacher Verification Portal</h1>
          {isVerified ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              Verified Faculty
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
              {accountState.replace("_", " ")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Verify your institutional affiliation to publish assessments, author official curricula, and grade student submissions.
        </p>
      </div>

      {/* Status overview card */}
      <Card className="glass-card border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {isVerified ? (
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              </div>
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">
                {isVerified ? "Institutional Credentials Verified" : "Verification In Progress or Required"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isVerified
                  ? "Your academic profile is confirmed. You have unrestricted access to create courses, build curriculum trees, author questions in the question bank, and assemble assessments."
                  : "Under the READY security model, role selection alone does not grant privileged access. Submit your academic email and university/institution name to obtain faculty verification."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Submission Form */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader>
          <CardTitle className="text-base text-white">
            {isVerified ? "Update Verification Affiliation" : "Submit Verification Request"}
          </CardTitle>
          <CardDescription className="text-xs">
            Provide your official institutional email and academic organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>College / University / School Name</span>
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Stanford University / National Institute of Technology"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Institutional Work Email</span>
              </label>
              <input
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="e.g. professor@university.edu"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Institutional domains (.edu, .ac.in, university-specific domains) are prioritized for automatic review.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Department / Teaching Focus / Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Department of Computer Science & Engineering; teaching Compiler Design and Data Structures."
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
            >
              {submitting ? "Submitting Request..." : "Submit Verification Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History of verification requests */}
      {requests.length > 0 && (
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Submission History</CardTitle>
            <CardDescription className="text-xs">
              Previous verification requests and audit decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-3 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {req.organization_name || "Independent Faculty"}
                      </span>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">{req.work_email}</p>
                    <p className="text-[10px] text-slate-500">
                      Submitted on {new Date(req.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  {req.status === "PENDING" && (
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      <span>In Review</span>
                    </div>
                  )}
                  {req.status === "VERIFIED" && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approved</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
