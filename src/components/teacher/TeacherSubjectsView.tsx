"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Search, Archive, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import type { TeacherSubject } from "@/types/database.types";

interface Props {
  initialSubjects: TeacherSubject[];
  isVerified: boolean;
}

export function TeacherSubjectsView({ initialSubjects, isVerified }: Props) {
  const [subjects, setSubjects] = React.useState<TeacherSubject[]>(initialSubjects);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [educationLevel, setEducationLevel] = React.useState("Undergraduate (B.Tech / B.S.)");
  const [academicYear, setAcademicYear] = React.useState("2026-2027");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/teacher/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          education_level: educationLevel,
          academic_year: academicYear,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create subject");
      }

      setSubjects([data.subject, ...subjects]);
      setName("");
      setCode("");
      setDescription("");
      setShowCreateModal(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(subjectId: string) {
    try {
      const res = await fetch(`/api/teacher/subjects/${subjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to archive subject");
      }

      setSubjects(
        subjects.map((s) => (s.id === subjectId ? { ...s, status: "ARCHIVED" } : s))
      );
    } catch (err) {
      console.error("Archive error:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">My Authored Subjects</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              {subjects.length} Subjects
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Author and maintain course syllabi, unit breakdowns, topics, and verified learning objectives.
          </p>
        </div>

        <div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Subject</span>
          </Button>
        </div>
      </div>

      {/* Independent Teacher Workspace Information Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Independent Teacher Workspace</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              You can create your own subjects, curriculum, questions and assessments. Join an institution if you want to become official faculty.
            </p>
          </div>
        </div>
        <Link href="/teacher/organizations" className="shrink-0">
          <Button size="sm" variant="outline" className="text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/40">
            Join an Institution
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subjects by name or course code..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-semibold text-white">Create New Course / Subject</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subject / Course Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Compiler Design, Distributed Systems, SQL Databases"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Course Code (Optional)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. CS-401, EE-202"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2026-2027"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Education Level</label>
                <input
                  type="text"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  placeholder="e.g. Undergraduate, Graduate, Higher Secondary"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Outline core course prerequisites, target learning objectives, and scope..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  {submitting ? "Creating..." : "Save Subject"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Cards Grid */}
      {filteredSubjects.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/60 p-12 text-center">
          <BookOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No subjects found</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            {searchTerm
              ? `No subjects match the search query "${searchTerm}".`
              : "Get started by adding your first subject to organize your course syllabus."}
          </p>
          {isVerified && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              Create Subject
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub) => (
            <Card
              key={sub.id}
              className="glass-card border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {sub.code && (
                      <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {sub.code}
                      </span>
                    )}
                    <CardTitle className="text-base text-white mt-2 leading-snug">{sub.name}</CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      sub.status === "ACTIVE"
                        ? "border-emerald-500/30 text-emerald-400"
                        : "border-slate-700 text-slate-500"
                    }`}
                  >
                    {sub.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {sub.description || "No description provided"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="rounded-lg bg-slate-900/50 p-2.5 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Level:</span>
                    <span className="text-slate-300 font-medium">{sub.education_level || "Undergraduate"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Academic Year:</span>
                    <span className="text-slate-300 font-medium">{sub.academic_year || "2026-2027"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <Link href={`/teacher/subjects/${sub.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-slate-700 hover:border-emerald-500/40 hover:text-emerald-300 gap-1.5"
                    >
                      <span>Manage Curriculum</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  {sub.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(sub.id)}
                      title="Archive Subject"
                      className="text-slate-500 hover:text-amber-400 p-2"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
