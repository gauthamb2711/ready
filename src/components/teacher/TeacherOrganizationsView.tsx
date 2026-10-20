"use client";

import * as React from "react";
import { useState } from "react";
import { Building2, Search, CheckCircle2, Clock, XCircle, Send, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Organization, Profile } from "@/types/database.types";

interface TeacherOrganizationsViewProps {
  profile: Profile | null;
  initialOrganizations: any[];
  initialRequests: any[];
  verifiedOrganizations: Organization[];
}

export function TeacherOrganizationsView({
  profile,
  initialOrganizations,
  initialRequests,
  verifiedOrganizations,
}: TeacherOrganizationsViewProps) {
  const [organizations, setOrganizations] = useState<any[]>(initialOrganizations);
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>(verifiedOrganizations);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [institutionEmail, setInstitutionEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const filteredOrgs = availableOrgs.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    try {
      const res = await fetch(`/api/organizations?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && data.organizations) {
        setAvailableOrgs(data.organizations);
      }
    } catch {
      // Fallback to client-side filtering
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      setMessage({ text: "Please select an organization to join.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}/faculty/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionEmail: institutionEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit join request");
      }

      setMessage({
        text: "Faculty join request submitted successfully! Awaiting College Admin approval.",
        type: "success",
      });

      // Refresh requests list
      const updatedReqs = [data.request, ...requests];
      setRequests(updatedReqs);
      setSelectedOrgId("");
      setInstitutionEmail("");
      setNotes("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to submit request", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Institutional Memberships
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Associate with verified colleges and universities to collaborate on institutional curriculum and assessment banks.
            </p>
          </div>
        </div>
      </div>

      {/* College Join Information Banner */}
      <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 flex items-center gap-3">
        <Building2 className="h-5 w-5 text-indigo-400 shrink-0" />
        <span className="text-xs text-indigo-200">
          To join a college or university, select your institution below and submit a faculty join request. Your College Admin will review and approve your membership.
        </span>
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

      {/* Grid: Current Memberships & Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Memberships */}
        <Card className="border-slate-800/80 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center justify-between">
              <span>Active Organizations</span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                {organizations.length} Verified
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Colleges and universities where you are an authorized faculty member.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-lg">
                <Building2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">Independent Teacher Mode</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You are currently operating as an independent faculty member. Join a verified institution below to link courses.
                </p>
              </div>
            ) : (
              organizations.map((orgMember) => (
                <div
                  key={orgMember.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-900/60"
                >
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {orgMember.organizations?.name || "Institution"}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Role: {orgMember.role}</span>
                      {orgMember.departments?.name && (
                        <>
                          <span>•</span>
                          <span>Dept: {orgMember.departments.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="default" className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="border-slate-800/80 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center justify-between">
              <span>Membership Requests</span>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                {requests.length} Total
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Your submissions awaiting College Admin verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-lg">
                <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No pending join requests</p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-900/60"
                >
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {req.organizations?.name || "Institution Request"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {req.notes || "Awaiting College Admin review"}
                    </div>
                  </div>
                  <div>
                    {req.status === "PENDING" && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
                        Pending
                      </Badge>
                    )}
                    {req.status === "APPROVED" && (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        Approved
                      </Badge>
                    )}
                    {req.status === "REJECTED" && (
                      <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">
                        Rejected
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discovery & Join Form */}
      <Card className="border-slate-800/80 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white">Discover & Join Verified Institutions</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Search for your college or university and submit a faculty verification request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinSubmit} className="space-y-5">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search verified colleges and universities..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-slate-950/60 border-slate-800"
              />
            </div>

            {/* Select Organization */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Select Verified Institution *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                {filteredOrgs.length === 0 ? (
                  <p className="text-xs text-slate-500 col-span-2 py-3">
                    No verified organizations found matching your search.
                  </p>
                ) : (
                  filteredOrgs.map((org) => {
                    const isSelected = selectedOrgId === org.id;
                    return (
                      <div
                        key={org.id}
                        onClick={() => setSelectedOrgId(org.id)}
                        className={`cursor-pointer p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-indigo-600/20 border-indigo-500/60 text-white"
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="font-semibold text-sm flex items-center justify-between">
                          <span>{org.name}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 capitalize">
                          {org.type.toLowerCase()} • Verified
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Institutional Email & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Institutional Email (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="e.g. professor@college.edu"
                  value={institutionEmail}
                  onChange={(e) => setInstitutionEmail(e.target.value)}
                  className="bg-slate-950/60 border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Department / Notes
                </label>
                <Input
                  placeholder="e.g. Computer Science & Engineering (Faculty ID: 1042)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-950/60 border-slate-800"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!selectedOrgId || isSubmitting}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? "Submitting Request..." : "Submit Join Request"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
