"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  ChevronRight,
  Sparkles,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockDashboardData } from "@/lib/services/mock.service";
import type { MockExam, MockExamAttempt } from "@/types/database.types";

interface MockDashboardViewProps {
  initialData: MockDashboardData;
}

export function MockDashboardView({ initialData }: MockDashboardViewProps) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>(
    initialData.selectedSubject?.id || ""
  );
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubjectFilter = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIsLoading(true);
    try {
      const url = subjectId ? `/api/student/mock?subjectId=${subjectId}` : "/api/student/mock";
      const res = await fetch(url);
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
      }
    } catch (err) {
      console.error("Failed to filter mocks by subject:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "HARD":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "EASY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "MIXED":
      default:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header and Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <span>Timed Exam Simulation</span>
            <span>•</span>
            <span>Server-Scored</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Mock Examination Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulate real exam pressure under enforced timers to benchmark stamina and pacing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data.subjects.length > 0 && (
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Subjects</option>
              {data.subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          )}

          <Link
            href="/student/mock/new"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Mock</span>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Total Completed</div>
          <div className="text-2xl lg:text-3xl font-black text-white mt-1">
            {data.stats.totalCompleted}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Timed attempts</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Best Score</div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-400 mt-1">
            {data.stats.bestPercentage}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Peak benchmark</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Latest Score</div>
          <div className="text-2xl lg:text-3xl font-black text-indigo-300 mt-1">
            {data.stats.latestPercentage !== null ? `${data.stats.latestPercentage}%` : "—"}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Most recent attempt</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-medium text-slate-400">Average Score</div>
          <div className="text-2xl lg:text-3xl font-black text-white mt-1">
            {data.stats.averagePercentage}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Across all simulations</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-400">Recent Growth</div>
          <div
            className={cn(
              "text-2xl lg:text-3xl font-black mt-1",
              data.stats.recentImprovement >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {data.stats.recentImprovement >= 0
              ? `+${data.stats.recentImprovement}`
              : data.stats.recentImprovement}
            <span className="text-sm font-normal ml-0.5">pp</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">First to latest delta</div>
        </div>
      </div>

      {/* Available Mocks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span>Configured Mock Exams ({data.mocks.length})</span>
          </h2>
          <Link
            href="/student/mock/new"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            + New Configuration
          </Link>
        </div>

        {data.mocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
            <FileText className="h-8 w-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No Mock Exams Configured</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create a full-length mock simulation to benchmark your performance under strict timer conditions.
            </p>
            <Link
              href="/student/mock/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create Mock Exam</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.mocks.map((mock) => {
              const durationMins = Math.round(mock.duration_seconds / 60);
              const isInProgress = mock.status === "IN_PROGRESS";

              return (
                <div
                  key={mock.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                        {mock.subjectName}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                          getDifficultyBadge(mock.difficulty)
                        )}
                      >
                        {mock.difficulty}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">{mock.title}</h3>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span>{mock.total_questions} Questions</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>{durationMins} Mins</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-slate-500" />
                        <span>{mock.total_marks} Marks</span>
                      </span>
                    </div>

                    {mock.latestAttempt && (
                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 mb-4 text-xs flex items-center justify-between">
                        <span className="text-slate-400">Latest Result:</span>
                        <span className="font-bold text-emerald-400">
                          {mock.latestAttempt.percentage}% ({mock.latestAttempt.score}/
                          {mock.total_marks})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <Link
                      href={`/student/mock/${mock.id}/attempt`}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                        isInProgress
                          ? "bg-amber-600 text-white hover:bg-amber-500"
                          : "bg-indigo-600 text-white hover:bg-indigo-500"
                      )}
                    >
                      <Play className="h-3 w-3" />
                      <span>{isInProgress ? "Resume Attempt" : "Start Mock"}</span>
                    </Link>

                    {mock.latestAttempt && (
                      <Link
                        href={`/student/mock/${mock.id}/result?attemptId=${mock.latestAttempt.id}`}
                        className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                      >
                        View Result
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Attempts History */}
      {data.recentAttempts.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-indigo-400" />
              <span>Past Simulation Results ({data.recentAttempts.length})</span>
            </h2>
            <Link
              href="/student/readiness"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>See Impact on Readiness</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Mock Exam</th>
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Score</th>
                  <th className="pb-3 font-semibold">Breakdown</th>
                  <th className="pb-3 font-semibold">Time Used</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.recentAttempts.map((att) => {
                  const usedMins = Math.round(att.time_used_seconds / 60);
                  const isExpired = att.status === "EXPIRED";

                  return (
                    <tr key={att.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 font-semibold text-white">{att.mockTitle}</td>
                      <td className="py-3 text-slate-400">{att.subjectName}</td>
                      <td className="py-3">
                        <span className="font-bold text-emerald-400">{att.percentage}%</span>
                        <span className="text-slate-500 ml-1">({att.score} pts)</span>
                      </td>
                      <td className="py-3 text-slate-400">
                        <span className="text-emerald-400">{att.correct_count} ✓</span>
                        <span className="text-rose-400 ml-2">{att.incorrect_count} ✗</span>
                        <span className="text-slate-500 ml-2">{att.unanswered_count} unans</span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {usedMins} mins {isExpired && <span className="text-rose-400">(Expired)</span>}
                      </td>
                      <td className="py-3 text-slate-500">
                        {att.submitted_at
                          ? new Date(att.submitted_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/student/mock/${att.mock_exam_id}/result?attemptId=${att.id}`}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-colors"
                        >
                          <span>Review</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
