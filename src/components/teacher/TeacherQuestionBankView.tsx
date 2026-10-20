"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type {
  CognitiveLevel,
  TeacherDifficulty,
  TeacherQuestion,
  TeacherQuestionOption,
  TeacherQuestionStatus,
  TeacherQuestionType,
  TeacherSubject,
} from "@/types/database.types";

interface Props {
  initialQuestions: TeacherQuestion[];
  subjects: TeacherSubject[];
  isVerified: boolean;
  initialCounts?: {
    total: number;
    draft: number;
    qualityCheck: number;
    review: number;
    approved: number;
    rejected: number;
    archived: number;
  };
}

export function TeacherQuestionBankView({
  initialQuestions,
  subjects,
  isVerified,
  initialCounts,
}: Props) {
  const [questions, setQuestions] = React.useState<TeacherQuestion[]>(initialQuestions);
  const [selectedSubject, setSelectedSubject] = React.useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>("ALL");
  const [selectedType, setSelectedType] = React.useState<string>("ALL");
  const [selectedCognitive, setSelectedCognitive] = React.useState<string>("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");

  const counts = React.useMemo(() => {
    return {
      total: initialCounts?.total ?? questions.length,
      draft: initialCounts?.draft ?? questions.filter((q) => q.status === "DRAFT").length,
      qualityCheck: initialCounts?.qualityCheck ?? questions.filter((q) => q.status === "QUALITY_CHECK").length,
      review: initialCounts?.review ?? questions.filter((q) => q.status === "REVIEW").length,
      approved: initialCounts?.approved ?? questions.filter((q) => q.status === "APPROVED").length,
      rejected: initialCounts?.rejected ?? questions.filter((q) => q.status === "REJECTED").length,
      archived: initialCounts?.archived ?? questions.filter((q) => q.status === "ARCHIVED").length,
    };
  }, [questions, initialCounts]);

  const filteredQuestions = questions.filter((q) => {
    if (selectedSubject !== "ALL" && q.subject_id !== selectedSubject) return false;
    if (selectedStatus !== "ALL" && q.status !== selectedStatus) return false;
    if (selectedDifficulty !== "ALL" && q.difficulty !== selectedDifficulty) return false;
    if (selectedType !== "ALL" && q.question_type !== selectedType) return false;
    if (selectedCognitive !== "ALL" && q.cognitive_level !== selectedCognitive) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchText = q.question_text?.toLowerCase().includes(term);
      const matchAnswer = q.correct_answer?.toLowerCase().includes(term);
      const matchSubtopic = q.subtopic?.toLowerCase().includes(term);
      const matchTags = Array.isArray(q.tags) && q.tags.some((t: string) => t.toLowerCase().includes(term));
      if (!matchText && !matchAnswer && !matchSubtopic && !matchTags) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Question Bank</h1>
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
              {counts.total} Items Total
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Author, inspect quality scores, review, and curate assessment questions with strict organization-aware multi-tenancy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/teacher/questions/review">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-amber-500/30 text-amber-300 hover:bg-amber-950/20 text-xs"
            >
              <Clock className="h-4 w-4" />
              <span>Review Queue ({counts.review})</span>
            </Button>
          </Link>
          <Link href="/teacher/questions/new">
            <Button
              disabled={!isVerified}
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create Question</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Counts Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedStatus("ALL")}
          className={`rounded-xl border p-3 text-left transition-all ${
            selectedStatus === "ALL"
              ? "border-indigo-500 bg-indigo-950/30"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-slate-400">All Questions</div>
          <div className="text-xl font-bold text-white mt-1">{counts.total}</div>
        </button>

        <button
          onClick={() => setSelectedStatus("DRAFT")}
          className={`rounded-xl border p-3 text-left transition-all ${
            selectedStatus === "DRAFT"
              ? "border-slate-400 bg-slate-800/40"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-slate-400">Drafts</div>
          <div className="text-xl font-bold text-slate-200 mt-1">{counts.draft}</div>
        </button>

        <button
          onClick={() => setSelectedStatus("REVIEW")}
          className={`rounded-xl border p-3 text-left transition-all ${
            selectedStatus === "REVIEW"
              ? "border-amber-500 bg-amber-950/30"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-amber-400">In Review</div>
          <div className="text-xl font-bold text-amber-300 mt-1">{counts.review}</div>
        </button>

        <button
          onClick={() => setSelectedStatus("APPROVED")}
          className={`rounded-xl border p-3 text-left transition-all ${
            selectedStatus === "APPROVED"
              ? "border-emerald-500 bg-emerald-950/30"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-400">Approved</div>
          <div className="text-xl font-bold text-emerald-300 mt-1">{counts.approved}</div>
        </button>

        <button
          onClick={() => setSelectedStatus("REJECTED")}
          className={`rounded-xl border p-3 text-left transition-all ${
            selectedStatus === "REJECTED"
              ? "border-red-500 bg-red-950/30"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-red-400">Rejected</div>
          <div className="text-xl font-bold text-red-300 mt-1">{counts.rejected}</div>
        </button>

        <button
          onClick={() => setSelectedStatus("ARCHIVED")}
          className={`rounded-xl border p-3 text-left transition-all ${
            selectedStatus === "ARCHIVED"
              ? "border-slate-600 bg-slate-800/40"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Archived</div>
          <div className="text-xl font-bold text-slate-400 mt-1">{counts.archived}</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="h-3.5 w-3.5 text-indigo-400" />
          <span>Filter Question Items</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search question text..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="REVIEW">IN REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">EASY</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HARD">HARD</option>
          </select>

          {/* Question Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="MULTIPLE_SELECT">MULTIPLE SELECT</option>
            <option value="TRUE_FALSE">TRUE / FALSE</option>
            <option value="SHORT_ANSWER">SHORT ANSWER</option>
            <option value="SCENARIO">SCENARIO</option>
            <option value="PROBLEM_SOLVING">PROBLEM SOLVING</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/60 p-12 text-center">
          <FileQuestion className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No questions found</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            {searchTerm || selectedStatus !== "ALL" || selectedSubject !== "ALL"
              ? "No questions match your current filter settings."
              : "Create your first manual question or generate templates from the curriculum builder."}
          </p>
          {isVerified && (
            <Link href="/teacher/questions/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                Create First Question
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => {
            const subject = subjects.find((s) => s.id === q.subject_id);

            return (
              <div
                key={q.id}
                className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-semibold bg-slate-800/60 px-1.5 py-0.5 rounded">
                      #{q.id.slice(0, 8)}
                    </span>
                    {subject && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {subject.name}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] py-0 px-2 border-slate-700 text-slate-300">
                      {q.question_type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 px-2 ${
                        q.difficulty === "HARD"
                          ? "border-red-500/30 text-red-400"
                          : q.difficulty === "MEDIUM"
                          ? "border-amber-500/30 text-amber-400"
                          : "border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {q.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] py-0 px-2 border-indigo-500/30 text-indigo-400">
                      {q.cognitive_level}
                    </Badge>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {q.marks} Mark{q.marks > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quality Status Badge */}
                    {q.quality_status === "PASS" && (
                      <div className="flex items-center gap-1 text-emerald-400 text-[11px]" title="Quality Check: PASS">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Pass</span>
                      </div>
                    )}
                    {q.quality_status === "WARNING" && (
                      <div className="flex items-center gap-1 text-amber-400 text-[11px]" title="Quality Check: WARNING">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Warning</span>
                      </div>
                    )}
                    {q.quality_status === "FAIL" && (
                      <div className="flex items-center gap-1 text-red-400 text-[11px]" title="Quality Check: FAIL">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Fail</span>
                      </div>
                    )}

                    {/* Question Status */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        q.status === "APPROVED"
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : q.status === "REVIEW"
                          ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                          : q.status === "REJECTED"
                          ? "border-red-500/30 text-red-400 bg-red-500/10"
                          : "border-slate-700 text-slate-400"
                      }`}
                    >
                      {q.status}
                    </Badge>
                  </div>
                </div>

                {q.subtopic && (
                  <div className="text-[11px] text-slate-400 font-medium">
                    Subtopic: <span className="text-slate-300">{q.subtopic}</span>
                  </div>
                )}

                {/* Question Text */}
                <p className="text-xs font-medium text-slate-200 leading-relaxed">
                  {q.question_text}
                </p>

                {/* Options Preview (if applicable) */}
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {q.options.map((opt: TeacherQuestionOption, i: number) => (
                      <div
                        key={opt.id || i}
                        className={`text-[11px] px-2.5 py-1 rounded border ${
                          opt.id === q.correct_answer || opt.text === q.correct_answer
                            ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300 font-medium"
                            : "border-slate-800/80 bg-slate-950/40 text-slate-400"
                        }`}
                      >
                        <span className="text-slate-500 mr-1.5 font-mono">{String.fromCharCode(65 + i)}.</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer with metadata and Action Links */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/40 text-[11px]">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>Author: {q.owner_id ? q.owner_id.slice(0, 8) : "N/A"}</span>
                    <span>•</span>
                    <span>Updated {new Date(q.updated_at || q.created_at).toISOString().split("T")[0]}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {["DRAFT", "QUALITY_CHECK", "REJECTED"].includes(q.status) && (
                      <Link href={`/teacher/questions/${q.id}/edit`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] h-7 border-slate-700 text-slate-300"
                        >
                          Edit
                        </Button>
                      </Link>
                    )}

                    <Link href={`/teacher/questions/${q.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-indigo-400 hover:text-indigo-300 gap-1 h-7"
                      >
                        <span>Details & Review</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
