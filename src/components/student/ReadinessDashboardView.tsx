"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  ArrowRight,
  RefreshCw,
  Award,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ReadinessAssessment,
  ReadinessComponent,
  ReadinessStatus,
  ReadinessEvidenceStatus,
  StudentSubject,
} from "@/types/database.types";
import type {
  AnalyzedTopicReadiness,
  ReadinessActionRecommendation,
} from "@/lib/intelligence/readiness";

interface ReadinessDashboardViewProps {
  initialData: {
    assessment: ReadinessAssessment;
    components: ReadinessComponent[];
    subject: StudentSubject;
    allSubjects: StudentSubject[];
    daysRemaining: number | null;
    analyzedTopics: AnalyzedTopicReadiness[];
    strongTopics: AnalyzedTopicReadiness[];
    weakTopics: AnalyzedTopicReadiness[];
    criticalWeakTopics: AnalyzedTopicReadiness[];
    unverifiedTopics: AnalyzedTopicReadiness[];
    recommendations: ReadinessActionRecommendation[];
    history: Array<{
      id: string;
      score: number;
      status: ReadinessStatus;
      calculatedAt: string;
      source: string;
    }>;
  };
}

export function ReadinessDashboardView({ initialData }: ReadinessDashboardViewProps) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState(initialData.subject.id);

  const handleSubjectChange = async (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    setIsRecalculating(true);
    try {
      const res = await fetch(`/api/student/readiness?subjectId=${newSubjectId}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      }
    } catch (err) {
      console.error("Failed to switch subject:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch("/api/student/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: data.subject.id }),
      });
      if (res.ok) {
        const refresh = await fetch(`/api/student/readiness?subjectId=${data.subject.id}`);
        if (refresh.ok) {
          const updated = await refresh.json();
          setData(updated);
        }
      }
    } catch (err) {
      console.error("Failed to recalculate readiness:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const getStatusBadge = (status: ReadinessStatus) => {
    switch (status) {
      case "HIGHLY_READY":
        return {
          label: "Highly Ready",
          color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          icon: Award,
        };
      case "READY":
        return {
          label: "Ready",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
        };
      case "DEVELOPING":
        return {
          label: "Developing",
          color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: TrendingUp,
        };
      case "NEEDS_WORK":
        return {
          label: "Needs Work",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: AlertTriangle,
        };
      case "NOT_READY":
      default:
        return {
          label: "Not Ready",
          color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: AlertTriangle,
        };
    }
  };

  const getEvidenceBadge = (status: ReadinessEvidenceStatus) => {
    switch (status) {
      case "SUFFICIENT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "LIMITED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "INSUFFICIENT":
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const statusBadge = getStatusBadge(data.assessment.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header and Subject Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <span>Evidence-Based Skill Engine</span>
            <span>•</span>
            <span>Day 7 Architecture</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Exam Readiness Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time synthesis of demonstrated mastery, retention strength, and mock simulations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data.allSubjects.length > 1 && (
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              {data.allSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRecalculating && "animate-spin")} />
            <span>{isRecalculating ? "Recalculating..." : "Recalculate"}</span>
          </button>

          <Link
            href="/student/mock/new"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
          >
            <span>Take Mock Exam</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Strict Disclaimer Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-300">
        <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Evidence-Based Readiness Estimate: </span>
          This score reflects the student&apos;s verified performance across diagnostic tests, learning gains, spaced retention retrieval, and timed mock exams. It represents preparation status and does NOT promise or guarantee examination success.
        </div>
      </div>

      {/* Main Score & Target Context Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Readiness Score Hero Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overall Readiness
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                statusBadge.color
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{statusBadge.label}</span>
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-black text-white tracking-tight">
              {data.assessment.score}
            </span>
            <span className="text-slate-500 text-lg font-bold">/ 100</span>
          </div>

          <div className="space-y-1.5 mb-6">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Preparation State</span>
              <span className="font-medium text-slate-200">
                Target: {data.assessment.target_capability}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, data.assessment.score))}%` }}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-400 border-t border-slate-800/80 pt-4">
            {data.assessment.summary?.explanation as string ||
              "Synthesized across all available verified learning and retention evidence."}
          </p>
        </div>

        {/* Target Context Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">
            <Target className="h-4 w-4 text-indigo-400" />
            <span>Target Capability Context</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[11px] text-slate-400">Current Capability</div>
              <div className="text-2xl font-bold text-white mt-1">
                {data.assessment.current_capability}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[11px] text-slate-400">Target Score</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {data.assessment.target_capability}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[11px] text-slate-400">Capability Gap</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {data.assessment.capability_gap}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[11px] text-slate-400">Days Remaining</div>
              <div className="text-2xl font-bold text-indigo-300 mt-1">
                {data.daysRemaining !== null ? `${data.daysRemaining}d` : "None set"}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>Exam Date: {data.assessment.exam_date || "No exam date configured"}</span>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Recommended Next Actions</span>
            </div>

            <div className="space-y-2.5">
              {data.recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-200">{rec.title}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase",
                        rec.priority === "HIGH"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      )}
                    >
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/student/plan"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View Learning Plan</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              href="/student/mock"
              className="text-xs text-slate-400 hover:text-slate-300 font-medium flex items-center gap-1"
            >
              <span>Mock Center</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Dimensions of Readiness (Evidence Matrix) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Readiness Dimensions & Evidence Weights
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic weighted evidence model with dynamic normalization for unavailable signals.
            </p>
          </div>
          <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
            Version {data.assessment.evidence_version}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.components.map((comp) => {
            const hasScore = comp.score !== null;
            const effWeightPct = Math.round(comp.effective_weight * 100);

            return (
              <div
                key={comp.id || comp.component_type}
                className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">
                      {comp.component_type.replace("_", " ")}
                    </span>
                    <span
                      className={cn(
                        "rounded border px-2 py-0.5 text-[10px] font-semibold",
                        getEvidenceBadge(comp.evidence_status)
                      )}
                    >
                      {comp.evidence_status}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-extrabold text-white">
                      {hasScore ? `${comp.score}%` : "—"}
                    </span>
                    <span className="text-xs text-slate-400">
                      weight: {Math.round(comp.weight * 100)}% (eff: {effWeightPct}%)
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {comp.explanation}
                  </p>
                </div>

                <div className="w-full bg-slate-800/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${hasScore ? comp.score : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Topic Strength & Weakness Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strong Topics */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <span>Strong Topics ({data.strongTopics.length})</span>
          </div>

          {data.strongTopics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              No topics classified as Strong (≥80%) yet. Complete learning actions and mock exams to verify topic strength.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.strongTopics.map((topic) => (
                <div
                  key={topic.topicId}
                  className="flex items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-950/10 p-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{topic.topicTitle}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{topic.evidenceSummary}</div>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {topic.compositeScore}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Needs Attention / Critical Weak Topics */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Needs Attention ({data.criticalWeakTopics.length + data.weakTopics.length})
            </span>
          </div>

          {data.criticalWeakTopics.length === 0 && data.weakTopics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              No weak or critical weak topics detected. Solid progress!
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Critical Weak first */}
              {data.criticalWeakTopics.map((topic) => (
                <div
                  key={topic.topicId}
                  className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-950/20 p-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{topic.topicTitle}</span>
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                        CRITICAL CORE
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{topic.evidenceSummary}</div>
                  </div>
                  <span className="text-sm font-bold text-rose-400">
                    {topic.compositeScore ?? 0}%
                  </span>
                </div>
              ))}

              {/* Regular Weak */}
              {data.weakTopics.map((topic) => (
                <div
                  key={topic.topicId}
                  className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-950/15 p-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{topic.topicTitle}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{topic.evidenceSummary}</div>
                  </div>
                  <span className="text-sm font-bold text-amber-400">
                    {topic.compositeScore ?? 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historical Readiness Progression */}
      {data.history.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span>Readiness Progression History</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {data.history.map((h, idx) => (
              <div
                key={h.id}
                className="flex flex-col items-center min-w-[130px] rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
              >
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(h.calculatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-xl font-black text-white mt-1">{h.score}</span>
                <span className="text-[10px] text-indigo-400 mt-0.5 font-medium">{h.source}</span>
                <span className="text-[9px] text-slate-500 uppercase mt-1">
                  {h.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
