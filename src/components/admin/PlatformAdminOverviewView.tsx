"use client";

import * as React from "react";
import { useState } from "react";
import {
  ShieldAlert,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PauseCircle,
  RefreshCw,
  BookOpen,
  Award,
  Layers,
  Lock,
  ExternalLink,
  Eye,
  Mail,
  Globe,
  FileText,
  Ban,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { PlatformGlobalAnalytics, Profile } from "@/types/database.types";
import type { OrganizationWithDetails } from "@/lib/services/organization.service";

interface PlatformAdminOverviewViewProps {
  profile: Profile | null;
  initialAnalytics: PlatformGlobalAnalytics;
  initialOrganizations: OrganizationWithDetails[];
}

export function PlatformAdminOverviewView({
  profile,
  initialAnalytics,
  initialOrganizations,
}: PlatformAdminOverviewViewProps) {
  const [analytics, setAnalytics] = useState<PlatformGlobalAnalytics>(initialAnalytics);
  const [organizations, setOrganizations] = useState<OrganizationWithDetails[]>(initialOrganizations);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Review & Inspection Dialog State
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithDetails | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const openInspectionModal = (org: OrganizationWithDetails) => {
    setSelectedOrg(org);
    setReviewNotes(org.verification?.review_notes || "");
  };

  const closeInspectionModal = () => {
    setSelectedOrg(null);
    setReviewNotes("");
  };

  // Review Organization Action
  const handleReviewOrg = async (
    orgId: string,
    action: "APPROVE" | "REJECT" | "SUSPEND" | "REVOKE",
    notesOverride?: string
  ) => {
    setIsProcessing(`${orgId}-${action}`);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${orgId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVIEW",
          reviewAction: action,
          reviewNotes: notesOverride ?? reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} organization`);
      }

      setMessage({ text: `Organization status successfully updated to ${data.status}`, type: "success" });

      // Update state locally
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId
            ? {
                ...org,
                verification_status: data.status,
                verified: action === "APPROVE",
                verification: org.verification
                  ? {
                      ...org.verification,
                      status: data.status,
                      review_notes: notesOverride ?? reviewNotes,
                      reviewed_at: new Date().toISOString(),
                    }
                  : null,
                creator: org.creator
                  ? {
                      ...org.creator,
                      account_state:
                        action === "APPROVE"
                          ? "ACTIVE"
                          : action === "REJECT"
                          ? "REJECTED"
                          : action === "SUSPEND"
                          ? "SUSPENDED"
                          : "REVOKED",
                    }
                  : null,
              }
            : org
        )
      );

      if (selectedOrg && selectedOrg.id === orgId) {
        setSelectedOrg((prev) =>
          prev
            ? {
                ...prev,
                verification_status: data.status,
                verified: action === "APPROVE",
                verification: prev.verification
                  ? {
                      ...prev.verification,
                      status: data.status,
                      review_notes: notesOverride ?? reviewNotes,
                      reviewed_at: new Date().toISOString(),
                    }
                  : null,
              }
            : null
        );
      }

      // Re-fetch analytics & organizations
      const anaRes = await fetch("/api/admin/overview");
      const anaData = await anaRes.json();
      if (anaData.success) {
        setAnalytics(anaData.analytics);
        if (anaData.organizations) {
          setOrganizations(anaData.organizations);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update organization", type: "error" });
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <Badge variant="default" className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">Verified</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">Pending Review</Badge>;
      case "UNDER_REVIEW":
        return <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 bg-indigo-500/10">Under Review</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "SUSPENDED":
        return <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10">Suspended</Badge>;
      case "REVOKED":
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Platform Superadmin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Platform Administration</h1>
              <Badge variant="outline" className="border-rose-500/40 text-rose-400">
                Superadmin Overview
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Global multi-tenant governance, organization trust verification, and aggregated SaaS metrics.
            </p>
          </div>
        </div>

        {/* Student Privacy Assurance Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-xs font-semibold">
          <Lock className="h-3.5 w-3.5" />
          <span>Student Private Data Protected</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-950/40 border border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border border-rose-500/40 text-rose-300"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Aggregated Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400">Total Platform Users</CardDescription>
            <CardTitle className="text-2xl font-bold text-white flex items-center justify-between">
              <span>{analytics.totalUsers}</span>
              <Users className="h-5 w-5 text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{analytics.activeUsers}</span> active accounts
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400">Verified Organizations</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400 flex items-center justify-between">
              <span>{analytics.verifiedOrganizations}</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-400">
              Colleges: {analytics.activeColleges} | Companies: {analytics.activeCompanies}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400">Pending Org Verifications</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400 flex items-center justify-between">
              <span>{analytics.pendingOrganizations}</span>
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-amber-400/80 font-medium">
              Requires Superadmin Trust Audit
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400">Platform Ecosystem</CardDescription>
            <CardTitle className="text-2xl font-bold text-white flex items-center justify-between">
              <span>{analytics.totalTeachers + analytics.totalStudents}</span>
              <Building2 className="h-5 w-5 text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-400">
              Teachers: {analytics.totalTeachers} | Students: {analytics.totalStudents}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Operational Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-sm font-semibold text-white">Teacher Assessments</div>
              <div className="text-xs text-slate-400">Institutional & Independent exams</div>
            </div>
          </div>
          <div className="text-xl font-bold text-white">{analytics.totalAssessments}</div>
        </div>

        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-sm font-semibold text-white">Question Bank Assets</div>
              <div className="text-xs text-slate-400">Total cataloged items</div>
            </div>
          </div>
          <div className="text-xl font-bold text-white">{analytics.totalQuestions}</div>
        </div>

        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-sm font-semibold text-white">Mock Exams Executed</div>
              <div className="text-xs text-slate-400">Simulations completed</div>
            </div>
          </div>
          <div className="text-xl font-bold text-white">{analytics.totalMockExams}</div>
        </div>
      </div>

      {/* Organization Verification Review Portal */}
      <Card className="border-slate-800/80 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span>Organization Trust & Verification Registry</span>
            </span>
            <Badge variant="outline" className="border-slate-700 text-slate-400">
              {organizations.length} Total Organizations
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Platform Admins verify the legitimacy and trust of colleges and companies. Verified organizations gain delegated authority to manage faculty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Submitter / Creator</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No organizations registered yet.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => {
                    const submitterEmail = org.verification?.official_email || org.creator?.email || (org.settings as any)?.official_email || "N/A";
                    const submitterName = org.creator?.display_name || `${org.creator?.first_name || ""} ${org.creator?.last_name || ""}`.trim() || submitterEmail;

                    return (
                      <tr key={org.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{org.name}</div>
                          <div className="text-[11px] text-slate-400">Slug: {org.slug}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] border-slate-700">
                            {org.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-slate-200 font-medium">{submitterName}</div>
                          <div className="text-[11px] text-slate-400">{submitterEmail}</div>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(org.verification_status || "PENDING")}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect & Review Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openInspectionModal(org)}
                              className="text-xs h-7 px-2.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Review Details</span>
                            </Button>

                            {/* Quick Action: Approve */}
                            {org.verification_status !== "VERIFIED" && (
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={isProcessing === `${org.id}-APPROVE`}
                                onClick={() => handleReviewOrg(org.id, "APPROVE")}
                                className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                Approve
                              </Button>
                            )}

                            {/* Quick Action: Reject */}
                            {org.verification_status !== "REJECTED" && org.verification_status !== "VERIFIED" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isProcessing === `${org.id}-REJECT`}
                                onClick={() => handleReviewOrg(org.id, "REJECT")}
                                className="text-xs h-7 px-2.5"
                              >
                                Reject
                              </Button>
                            )}

                            {/* Quick Action: Suspend */}
                            {org.verification_status === "VERIFIED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing === `${org.id}-SUSPEND`}
                                onClick={() => handleReviewOrg(org.id, "SUSPEND")}
                                className="text-xs h-7 px-2.5 border-amber-500/40 text-amber-400 hover:bg-amber-950/30"
                              >
                                Suspend
                              </Button>
                            )}

                            {/* Quick Action: Revoke */}
                            {org.verification_status === "VERIFIED" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isProcessing === `${org.id}-REVOKE`}
                                onClick={() => handleReviewOrg(org.id, "REVOKE")}
                                className="text-xs h-7 px-2.5 bg-rose-700 hover:bg-rose-600"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Inspect & Review Organization Details Modal */}
      {selectedOrg && (
        <Dialog
          isOpen={!!selectedOrg}
          onClose={closeInspectionModal}
          title={`Review Organization: ${selectedOrg.name}`}
          description="Examine institutional credentials, contact dossier, and verify platform trust authorization."
        >
          <div className="space-y-5 text-sm">
            {/* Summary Header */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-white">{selectedOrg.name}</div>
                  <div className="text-xs text-slate-400">Slug: {selectedOrg.slug}</div>
                </div>
                <div>{getStatusBadge(selectedOrg.verification_status || "PENDING")}</div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800">
                <span className="text-indigo-400 font-semibold">{selectedOrg.type}</span>
                <span>•</span>
                <span>Registered: {new Date(selectedOrg.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>Country: {selectedOrg.country_code || "US"}</span>
              </div>
            </div>

            {/* Submitter & Dossier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Submitter Profile</span>
                </div>
                <div className="text-white font-semibold text-sm">
                  {selectedOrg.creator?.display_name ||
                    `${selectedOrg.creator?.first_name || ""} ${selectedOrg.creator?.last_name || ""}`.trim() ||
                    "Administrator"}
                </div>
                <div className="text-slate-300">{selectedOrg.creator?.email || "Email not available"}</div>
                <div className="text-slate-400 text-[11px]">
                  Account State:{" "}
                  <span className="text-emerald-400 font-medium">
                    {selectedOrg.creator?.account_state || "PENDING"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Official Contact Email</span>
                </div>
                <div className="text-white font-semibold text-sm">
                  {selectedOrg.verification?.official_email ||
                    (selectedOrg.settings as any)?.official_email ||
                    selectedOrg.creator?.email ||
                    "Not provided"}
                </div>
                <div className="text-slate-400 flex items-center gap-1.5 pt-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>{selectedOrg.verification?.website_url || "Website not provided"}</span>
                </div>
              </div>
            </div>

            {/* Verification / Submission Notes */}
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5 font-medium text-xs">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                <span>Submitter Dossier & Notes</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed italic">
                {selectedOrg.verification?.review_notes ||
                  (selectedOrg.settings as any)?.notes ||
                  "College / University registration awaiting Platform Admin review."}
              </p>
            </div>

            {/* Superadmin Notes Input */}
            <div className="space-y-1.5">
              <label htmlFor="admin-notes" className="text-xs font-semibold text-slate-300">
                Platform Admin Audit Notes
              </label>
              <textarea
                id="admin-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter audit rationale, accreditation verification notes, or reason for status update..."
                className="w-full h-20 rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Action Buttons Toolbar */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={closeInspectionModal}
                className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Close
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Approve Button */}
                <Button
                  size="sm"
                  variant="primary"
                  disabled={isProcessing !== null}
                  onClick={() => handleReviewOrg(selectedOrg.id, "APPROVE", reviewNotes)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve & Verify</span>
                </Button>

                {/* Reject Button */}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isProcessing !== null}
                  onClick={() => handleReviewOrg(selectedOrg.id, "REJECT", reviewNotes)}
                  className="text-xs gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </Button>

                {/* Suspend Button */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing !== null}
                  onClick={() => handleReviewOrg(selectedOrg.id, "SUSPEND", reviewNotes)}
                  className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-950/30 gap-1"
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  <span>Suspend</span>
                </Button>

                {/* Revoke Button */}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isProcessing !== null}
                  onClick={() => handleReviewOrg(selectedOrg.id, "REVOKE", reviewNotes)}
                  className="text-xs bg-rose-700 hover:bg-rose-600 gap-1"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Revoke</span>
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
