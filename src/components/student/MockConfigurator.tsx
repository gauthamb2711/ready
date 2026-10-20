"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentSubject, MockExamDifficulty } from "@/types/database.types";

interface MockConfiguratorProps {
  subjects: StudentSubject[];
}

export function MockConfigurator({ subjects }: MockConfiguratorProps) {
  const router = useRouter();

  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>(
    subjects[0]?.id || ""
  );
  const [customTitle, setCustomTitle] = React.useState<string>("");
  const [questionCount, setQuestionCount] = React.useState<number>(10);
  const [durationMinutes, setDurationMinutes] = React.useState<number>(20);
  const [difficulty, setDifficulty] = React.useState<MockExamDifficulty>("MIXED");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const defaultTitle = selectedSubject
    ? `${selectedSubject.name} - ${difficulty} Mock Simulation (${questionCount}Q)`
    : `Mock Simulation (${questionCount}Q)`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      setErrorMessage("Please select a subject.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/student/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          title: customTitle.trim() || defaultTitle,
          totalQuestions: questionCount,
          durationMinutes,
          difficulty,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create mock exam.");
      }

      const createdMock = await res.json();
      router.push(`/student/mock/${createdMock.id}/attempt`);
    } catch (err: any) {
      console.error("Error creating mock exam:", err);
      setErrorMessage(err?.message || "Failed to generate mock exam. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/student/mock" className="hover:text-slate-200 flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Back to Mock Center</span>
        </Link>
        <span>/</span>
        <span className="text-slate-200">New Simulation</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Configure Mock Examination
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate an exam simulation with balanced syllabus distribution and server-enforced timing.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 text-xs text-rose-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl space-y-6">
          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Target Subject
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((sub) => {
                const isSelected = sub.id === selectedSubjectId;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={cn(
                      "flex flex-col text-left p-4 rounded-xl border transition-all",
                      isSelected
                        ? "border-indigo-500/50 bg-indigo-600/15 text-white shadow-md shadow-indigo-600/10"
                        : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                    )}
                  >
                    <span className="text-xs font-bold">{sub.name}</span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Target: {sub.target_score || "85"}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exam Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Exam Title (Optional)
            </label>
            <input
              type="text"
              placeholder={defaultTitle}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Question Count
            </label>
            <div className="grid grid-cols-5 gap-2.5">
              {[5, 10, 15, 20, 30].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={cn(
                    "py-2.5 rounded-xl border text-xs font-bold transition-all",
                    questionCount === num
                      ? "border-indigo-500/50 bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  )}
                >
                  {num}Q
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Duration (Minutes)
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[15, 20, 30, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={cn(
                    "py-2.5 rounded-xl border text-xs font-bold transition-all",
                    durationMinutes === mins
                      ? "border-indigo-500/50 bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  )}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Difficulty Tier
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {(["MIXED", "EASY", "MEDIUM", "HARD"] as MockExamDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={cn(
                    "py-2.5 rounded-xl border text-xs font-bold transition-all",
                    difficulty === diff
                      ? "border-indigo-500/50 bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  )}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Security & Rules Info */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Server-Enforced Rules</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li>Timer runs from server start timestamp; client clock changes have zero effect.</li>
              <li>Answers auto-save idempotently per question.</li>
              <li>Correct answers remain server-side and are never sent prior to submission.</li>
              <li>Submitting the mock updates your official Exam Readiness Score.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/student/mock"
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 transition-all"
          >
            <span>{isSubmitting ? "Generating Exam..." : "Generate & Start Simulation"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
