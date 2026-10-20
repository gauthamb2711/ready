"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockExam, MockExamAttempt, StudentSubject } from "@/types/database.types";
import type { MockTopicEvaluation } from "@/lib/intelligence/mock-engine";

interface MockResultAnalysisViewProps {
  attempt: MockExamAttempt;
  mockExam: MockExam;
  subject: StudentSubject;
  topicPerformance: Record<string, MockTopicEvaluation>;
  reviewItems: Array<{
    questionId: string;
    topicTitle: string;
    prompt: string;
    options: string[];
    selectedAnswer: string | null;
    correctAnswer: string;
    explanation: string | null;
    isCorrect: boolean;
    marks: number;
    awardedMarks: number;
  }>;
}

export function MockResultAnalysisView({
  attempt,
  mockExam,
  subject,
  topicPerformance,
  reviewItems,
}: MockResultAnalysisViewProps) {
  const [filterType, setFilterType] = React.useState<"ALL" | "INCORRECT" | "CORRECT">("ALL");
  const [expandedQuestions, setExpandedQuestions] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const usedMins = Math.round(attempt.time_used_seconds / 60);
  const totalMins = Math.round(mockExam.duration_seconds / 60);

  const topicsList = Object.values(topicPerformance);
  const strongTopics = topicsList.filter((t) => t.status === "STRONG");
  const weakTopics = topicsList.filter((t) => t.status === "WEAK");
  const needsPracticeTopics = topicsList.filter((t) => t.status === "NEEDS_PRACTICE");
  const unverifiedTopics = topicsList.filter((t) => t.status === "NOT_ENOUGH_EVIDENCE");

  const filteredQuestions = reviewItems.filter((q) => {
    if (filterType === "CORRECT") return q.isCorrect;
    if (filterType === "INCORRECT") return !q.isCorrect;
    return true;
  });

  const getTopicStatusBadge = (status: string) => {
    switch (status) {
      case "STRONG":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "NEEDS_PRACTICE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "WEAK":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "NOT_ENOUGH_EVIDENCE":
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner and Navigation */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <span>Verified Simulation Result</span>
            <span>•</span>
            <span>{subject?.name || "Subject"}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {mockExam.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Completed on {new Date(attempt.submitted_at || attempt.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/student/mock/new"
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retake Simulation</span>
          </Link>

          <Link
            href={`/student/readiness?subjectId=${mockExam.subject_id}`}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
          >
            <span>View Updated Readiness</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Readiness Recalculation Notice */}
      <div className="flex items-center justify-between rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/40 to-slate-900/40 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Readiness Recalculated Automatically</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Your mock performance has been verified and incorporated into your 6-dimension Readiness Score.
            </div>
          </div>
        </div>
        <Link
          href={`/student/readiness?subjectId=${mockExam.subject_id}`}
          className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 shrink-0"
        >
          <span>Examine Evidence</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Score Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Total Score</div>
          <div className="text-3xl font-black text-white mt-1">
            {attempt.score} <span className="text-sm text-slate-500 font-bold">/ {mockExam.total_marks}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Marks awarded</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Percentage</div>
          <div className="text-3xl font-black text-indigo-300 mt-1">{attempt.percentage}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Exam benchmark</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Correct</div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{attempt.correct_count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Accurate answers</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Incorrect</div>
          <div className="text-3xl font-black text-rose-400 mt-1">{attempt.incorrect_count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Review recommended</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Unanswered</div>
          <div className="text-3xl font-black text-amber-400 mt-1">{attempt.unanswered_count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Pacing opportunity</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Time Used</div>
          <div className="text-3xl font-black text-white mt-1">
            {usedMins}m <span className="text-sm text-slate-500 font-bold">/ {totalMins}m</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {attempt.status === "EXPIRED" ? "Time expired" : "Completed on time"}
          </div>
        </div>
      </div>

      {/* Topic Performance Breakdown Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
        <h2 className="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span>Topic-Level Performance Analysis</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Topic Title</th>
                <th className="pb-3 font-semibold">Questions</th>
                <th className="pb-3 font-semibold">Correct / Incorrect</th>
                <th className="pb-3 font-semibold">Marks Earned</th>
                <th className="pb-3 font-semibold">Accuracy</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topicsList.map((t) => (
                <tr key={t.topicTitle} className="hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 font-semibold text-white">{t.topicTitle}</td>
                  <td className="py-3 text-slate-400">
                    {t.questionsAttempted} of {t.questionsTotal} attempted
                  </td>
                  <td className="py-3 text-slate-300">
                    <span className="text-emerald-400 font-bold">{t.correctCount} ✓</span>
                    <span className="text-rose-400 font-bold ml-2">{t.incorrectCount} ✗</span>
                    {t.unansweredCount > 0 && (
                      <span className="text-slate-500 ml-2">({t.unansweredCount} skipped)</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-300">
                    {t.marksEarned} / {t.totalMarks}
                  </td>
                  <td className="py-3 font-bold text-white">{t.percentage}%</td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase",
                        getTopicStatusBadge(t.status)
                      )}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strong vs Weak Topic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
            <CheckCircle2 className="h-4 w-4" />
            <span>Strong Topics ({strongTopics.length})</span>
          </div>
          {strongTopics.length === 0 ? (
            <p className="text-xs text-slate-500">None met the ≥80% strong threshold.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-300">
              {strongTopics.map((t) => (
                <li key={t.topicTitle} className="flex justify-between">
                  <span>{t.topicTitle}</span>
                  <span className="font-bold text-emerald-400">{t.percentage}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
            <AlertTriangle className="h-4 w-4" />
            <span>Needs Practice ({needsPracticeTopics.length})</span>
          </div>
          {needsPracticeTopics.length === 0 ? (
            <p className="text-xs text-slate-500">None in the 60-79% range.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-300">
              {needsPracticeTopics.map((t) => (
                <li key={t.topicTitle} className="flex justify-between">
                  <span>{t.topicTitle}</span>
                  <span className="font-bold text-amber-400">{t.percentage}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
            <XCircle className="h-4 w-4" />
            <span>Weak Topics ({weakTopics.length})</span>
          </div>
          {weakTopics.length === 0 ? (
            <p className="text-xs text-slate-500">No weak topics below 60%.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-300">
              {weakTopics.map((t) => (
                <li key={t.topicTitle} className="flex justify-between">
                  <span>{t.topicTitle}</span>
                  <span className="font-bold text-rose-400">{t.percentage}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Question-by-Question Review */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Detailed Question Review ({reviewItems.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect answer keys and detailed explanations revealed post-submission.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["ALL", "INCORRECT", "CORRECT"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterType(mode)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  filterType === mode
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isExpanded = expandedQuestions[q.questionId] ?? true;

            return (
              <div
                key={q.questionId}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  q.isCorrect
                    ? "border-emerald-500/20 bg-emerald-950/10"
                    : q.selectedAnswer === null
                    ? "border-amber-500/20 bg-amber-950/10"
                    : "border-rose-500/20 bg-rose-950/10"
                )}
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleExpand(q.questionId)}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5">
                      {q.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : q.selectedAnswer === null ? (
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-400" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">Question {idx + 1}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.2 text-[10px] font-medium text-slate-400">
                          {q.topicTitle}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {q.awardedMarks}/{q.marks} Marks
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 leading-relaxed">
                        {q.prompt}
                      </p>
                    </div>
                  </div>

                  <button className="text-slate-500 hover:text-slate-300 ml-2">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                          Your Answer
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            q.isCorrect
                              ? "text-emerald-400"
                              : q.selectedAnswer === null
                              ? "text-amber-400"
                              : "text-rose-400"
                          )}
                        >
                          {q.selectedAnswer || "(Unanswered / Skipped)"}
                        </span>
                      </div>

                      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                          Correct Answer
                        </span>
                        <span className="font-semibold text-emerald-400">{q.correctAnswer}</span>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800/60 p-3 text-[11px] text-slate-400 leading-relaxed">
                        <strong className="text-slate-300 font-semibold">Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
