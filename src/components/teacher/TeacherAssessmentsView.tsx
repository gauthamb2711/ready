"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  Plus,
  Search,
  BookOpen,
  FileQuestion,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle,
  Filter,
  Eye,
  Edit3,
  Calendar,
  Lock,
  Send,
} from "lucide-react";
import type { TeacherAssessment, TeacherSubject } from "@/types/database.types";

interface Props {
  initialAssessments: TeacherAssessment[];
  subjects: TeacherSubject[];
  approvedQuestions?: any[];
  isVerified: boolean;
}

export function TeacherAssessmentsView({
  initialAssessments,
  subjects,
  isVerified,
}: Props) {
  const [assessments, setAssessments] = React.useState<TeacherAssessment[]>(initialAssessments);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [selectedType, setSelectedType] = React.useState<string>("ALL");

  // Summary counts
  const counts = React.useMemo(() => {
    return {
      total: assessments.length,
      published: assessments.filter((a) => a.status === "PUBLISHED").length,
      draft: assessments.filter((a) => a.status === "DRAFT").length,
      closed: assessments.filter((a) => a.status === "CLOSED").length,
      archived: assessments.filter((a) => a.status === "ARCHIVED").length,
    };
  }, [assessments]);

  // Filtered list
  const filteredAssessments = React.useMemo(() => {
    return assessments.filter((a) => {
      if (selectedSubjectId !== "ALL" && a.subject_id !== selectedSubjectId) return false;
      if (selectedStatus !== "ALL" && a.status !== selectedStatus) return false;
      if (selectedType !== "ALL" && a.assessment_type !== selectedType) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(term);
        const matchesDesc = a.description?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [assessments, selectedSubjectId, selectedStatus, selectedType, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Assessment Builder & Exams</h1>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400">
              Day 10 Production
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Author standardized diagnostic papers, quizzes, and secure exam blueprints.
          </p>
        </div>

        <div>
          <Link href="/teacher/assessments/new">
            <Button
              disabled={!isVerified}
              size="sm"
              className="gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-medium text-xs shadow-lg shadow-amber-950/20"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Assessment</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedStatus("ALL")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "ALL"
              ? "bg-slate-900 border-amber-500/50"
              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-slate-400">Total Assessments</div>
          <div className="text-2xl font-bold text-white mt-1">{counts.total}</div>
        </div>

        <div
          onClick={() => setSelectedStatus("PUBLISHED")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "PUBLISHED"
              ? "bg-emerald-950/30 border-emerald-500/50"
              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-400">Published / Active</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{counts.published}</div>
        </div>

        <div
          onClick={() => setSelectedStatus("DRAFT")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "DRAFT"
              ? "bg-amber-950/30 border-amber-500/50"
              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-amber-400">Draft Blueprints</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{counts.draft}</div>
        </div>

        <div
          onClick={() => setSelectedStatus("CLOSED")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "CLOSED"
              ? "bg-red-950/30 border-red-500/50"
              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-slate-400">Closed / Archived</div>
          <div className="text-2xl font-bold text-slate-300 mt-1">{counts.closed + counts.archived}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="glass-card border-slate-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search assessment title..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Subject Filter */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Assessment Types</option>
              <option value="EXAM">EXAM</option>
              <option value="QUIZ">QUIZ</option>
              <option value="ASSIGNMENT">ASSIGNMENT</option>
              <option value="DIAGNOSTIC">DIAGNOSTIC</option>
              <option value="MOCK">MOCK</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Assessments Grid */}
      {filteredAssessments.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/60 p-12 text-center">
          <Award className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No assessments match your filters</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            Create an assessment blueprint to assemble questions, set schedules, and publish exams for your students.
          </p>
          {isVerified && (
            <Link href="/teacher/assessments/new">
              <Button className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-medium text-xs">
                Launch Assessment Builder
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssessments.map((a) => {
            const subject = subjects.find((s) => s.id === a.subject_id);

            return (
              <Card
                key={a.id}
                className="glass-card border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {subject && (
                        <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {subject.name}
                        </span>
                      )}
                      <CardTitle className="text-base text-white mt-2 leading-snug group-hover:text-amber-300 transition-colors">
                        {a.title}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        a.status === "PUBLISHED"
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : a.status === "CLOSED"
                          ? "border-red-500/30 text-red-400 bg-red-500/10"
                          : a.status === "ARCHIVED"
                          ? "border-slate-700 text-slate-400"
                          : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {a.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-1 text-slate-400">
                    {a.description || a.instructions || "No description provided"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Meta stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Marks</span>
                      <span className="font-bold text-emerald-400">{a.total_marks} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Duration</span>
                      <span className="font-bold text-white">{a.duration_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Questions</span>
                      <span className="font-bold text-amber-400">{a.question_count ?? 0}</span>
                    </div>
                  </div>

                  {/* Schedule if any */}
                  {a.scheduled_start && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">
                        {new Date(a.scheduled_start).toLocaleDateString()}
                        {a.scheduled_end ? ` – ${new Date(a.scheduled_end).toLocaleDateString()}` : ""}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link href={`/teacher/assessments/${a.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-slate-700 hover:border-slate-600 text-slate-200 gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Blueprint</span>
                      </Button>
                    </Link>

                    <Link href={`/teacher/assessments/${a.id}/edit`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-slate-700 hover:border-amber-500/40 text-amber-300"
                        title="Edit Blueprint"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
