"use client";

import * as React from "react";
import { useState } from "react";
import { Users, UserCheck, UserX, Building2, CheckCircle2, AlertCircle, Plus, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Organization, OrganizationDepartment, Profile } from "@/types/database.types";

interface CollegeFacultyManagementViewProps {
  profile: Profile | null;
  organization: Organization;
  initialFaculty: any[];
  initialRequests: any[];
  initialDepartments: OrganizationDepartment[];
}

function formatRequestDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function CollegeFacultyManagementView({
  profile,
  organization,
  initialFaculty,
  initialRequests,
  initialDepartments,
}: CollegeFacultyManagementViewProps) {
  const [faculty, setFaculty] = useState<any[]>(initialFaculty);
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [departments, setDepartments] = useState<OrganizationDepartment[]>(initialDepartments);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const processedRequests = requests.filter((r) => r.status !== "PENDING");

  // Approve faculty join request
  const handleApprove = async (requestId: string, teacherUserId: string) => {
    if (teacherUserId === profile?.id) {
      setMessage({ text: "Security Restriction: You cannot approve your own faculty request.", type: "error" });
      return;
    }

    setIsProcessing(requestId);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/faculty/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve faculty request");
      }

      setMessage({ text: "Faculty member approved and granted active institutional role.", type: "success" });

      // Update state locally
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "APPROVED" } : r))
      );
      // Re-fetch faculty & requests from server
      const facRes = await fetch(`/api/organizations/${organization.id}/faculty`);
      const facData = await facRes.json();
      if (facData.success) {
        setFaculty(facData.faculty || []);
        if (Array.isArray(facData.requests)) {
          setRequests(facData.requests);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to approve request", type: "error" });
    } finally {
      setIsProcessing(null);
    }
  };

  // Reject faculty join request
  const handleReject = async (requestId: string) => {
    setIsProcessing(requestId);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/faculty/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Credentials not verified by institution administration." }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject faculty request");
      }

      setMessage({ text: "Faculty request rejected.", type: "success" });

      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "REJECTED" } : r))
      );
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reject request", type: "error" });
    } finally {
      setIsProcessing(null);
    }
  };

  // Remove faculty member
  const handleRemove = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this faculty member from your organization?")) {
      return;
    }

    setIsProcessing(memberId);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/faculty/${memberId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove faculty member");
      }

      setMessage({ text: "Faculty member removed from organization.", type: "success" });
      setFaculty((prev) => prev.filter((m) => m.id !== memberId && m.user_id !== memberId));
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to remove member", type: "error" });
    } finally {
      setIsProcessing(null);
    }
  };

  // Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const res = await fetch(`/api/organizations/${organization.id}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim(), code: newDeptCode.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create department");
      }

      setDepartments((prev) => [...prev, data.department]);
      setNewDeptName("");
      setNewDeptCode("");
      setMessage({ text: `Department "${data.department.name}" added successfully.`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to add department", type: "error" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{organization.name}</h1>
              <Badge variant="default" className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                {organization.verification_status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              College Administration • Faculty Membership & Department Permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-700 text-slate-300">
            Tenant ID: {organization.id.substring(0, 8)}...
          </Badge>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border text-sm ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
              : "bg-rose-950/40 border-rose-800/80 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Pending Faculty Requests */}
      <Card className="border-slate-800/80 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400" />
              <span>Pending Faculty Join Requests</span>
            </span>
            <Badge variant="outline" className="border-amber-500/40 text-amber-400">
              {pendingRequests.length} Pending Approval
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Teachers who have requested affiliation with {organization.name}. College Admins hold sole authority to grant faculty access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No pending faculty requests</p>
              <p className="text-xs text-slate-500 mt-1">All teacher verification requests have been addressed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-800 bg-slate-900/80"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {req.profiles?.display_name || req.profiles?.email || "Faculty Applicant"}
                      </span>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] uppercase">
                        {req.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                      <span>Email: {req.work_email || req.profiles?.email}</span>
                      <span>•</span>
                      <span>Dept: {req.departments?.name || "General / Unassigned"}</span>
                      <span>•</span>
                      <span>Date: {formatRequestDate(req.created_at || req.submitted_at)}</span>
                      {req.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-300">"{req.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isProcessing === req.id}
                      onClick={() => handleApprove(req.id, req.user_id)}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isProcessing === req.id}
                      onClick={() => handleReject(req.id)}
                      className="gap-1.5"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Faculty Roster */}
      <Card className="border-slate-800/80 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Active Institutional Faculty</span>
            </span>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
              {faculty.filter((f) => f.status === "ACTIVE").length} Members
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Verified teachers permitted to author subjects and assessments under {organization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {faculty.filter((f) => f.status === "ACTIVE").length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-lg">
              <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No active faculty members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {faculty
                .filter((f) => f.status === "ACTIVE")
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-900/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {member.profiles?.display_name || member.profiles?.email || "Faculty Member"}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/30 text-emerald-400">
                          {member.status || "ACTIVE"}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 border-indigo-500/30 text-indigo-400">
                          Role: {member.role}
                        </Badge>
                        <span>•</span>
                        <span>Dept: {member.departments?.name || "General"}</span>
                        <span>•</span>
                        <span>{member.profiles?.email}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isProcessing === member.id || member.user_id === profile?.id}
                      onClick={() => handleRemove(member.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Departments Section */}
      <Card className="border-slate-800/80 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white">Academic Departments</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Define institutional departments for faculty assignment (e.g. Computer Science, Mechanical).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleCreateDepartment} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Department Name (e.g. Computer Science)"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="bg-slate-950/60 border-slate-800 text-sm"
            />
            <Input
              placeholder="Code (e.g. CSE)"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
              className="bg-slate-950/60 border-slate-800 text-sm sm:w-32"
            />
            <Button type="submit" variant="outline" className="gap-2 shrink-0 border-slate-700">
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </Button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {departments.length === 0 ? (
              <p className="text-xs text-slate-500 col-span-3">No departments created yet.</p>
            ) : (
              departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-slate-200">{dept.name}</span>
                  {dept.code && (
                    <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                      {dept.code}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
