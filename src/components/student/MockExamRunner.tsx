"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockExam, MockExamAttempt } from "@/types/database.types";
import type { ClientSafeMockQuestion } from "@/lib/intelligence/mock-engine";

interface MockExamRunnerProps {
  mockExam: MockExam;
  attempt: MockExamAttempt;
  questions: ClientSafeMockQuestion[];
  initialResponses: Record<string, string | null>;
  initialTimeRemainingSeconds: number;
}

export function MockExamRunner({
  mockExam,
  attempt,
  questions,
  initialResponses,
  initialTimeRemainingSeconds,
}: MockExamRunnerProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [responses, setResponses] = React.useState<Record<string, string | null>>(initialResponses);
  const [secondsRemaining, setSecondsRemaining] = React.useState(initialTimeRemainingSeconds);
  const [saveStatus, setSaveStatus] = React.useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [isTimeExpired, setIsTimeExpired] = React.useState(false);

  const currentQuestion = questions[currentIndex];

  // Countdown timer
  React.useEffect(() => {
    if (secondsRemaining <= 0) {
      setIsTimeExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimeExpired(true);
          handleAutoSubmitOnExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = async (option: string) => {
    if (isTimeExpired || isSubmitting) return;

    const newResponses = { ...responses, [currentQuestion.question_id]: option };
    setResponses(newResponses);
    setSaveStatus("SAVING");

    try {
      const res = await fetch(`/api/student/mock/${mockExam.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE",
          attemptId: attempt.id,
          questionId: currentQuestion.question_id,
          selectedAnswer: option,
        }),
      });

      if (res.ok) {
        setSaveStatus("SAVED");
        setTimeout(() => setSaveStatus("IDLE"), 2000);
      } else {
        setSaveStatus("ERROR");
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
      setSaveStatus("ERROR");
    }
  };

  const handleAutoSubmitOnExpire = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/student/mock/${mockExam.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          attemptId: attempt.id,
        }),
      });

      if (res.ok) {
        router.push(`/student/mock/${mockExam.id}/result?attemptId=${attempt.id}`);
      }
    } catch (err) {
      console.error("Failed auto-submit on expiry:", err);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/student/mock/${mockExam.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          attemptId: attempt.id,
        }),
      });

      if (res.ok) {
        router.push(`/student/mock/${mockExam.id}/result?attemptId=${attempt.id}`);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Submission failed. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.values(responses).filter((v) => v !== null && v !== "").length;
  const unansweredCount = questions.length - answeredCount;

  const isLowTime = secondsRemaining <= 300; // < 5 mins
  const isCriticalTime = secondsRemaining <= 60; // < 1 min

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header with Synced Timer & Status */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-xs">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold text-white line-clamp-1">{mockExam.title}</h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>•</span>
              <span>{answeredCount} Answered</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Server-Synced Timer */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3.5 py-1.5 font-mono text-sm font-bold transition-colors",
              isCriticalTime
                ? "border-rose-500/50 bg-rose-950/40 text-rose-400 animate-pulse"
                : isLowTime
                ? "border-amber-500/50 bg-amber-950/40 text-amber-400"
                : "border-slate-800 bg-slate-900 text-slate-200"
            )}
          >
            <Clock className="h-4 w-4" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 lg:p-6 gap-6">
        {/* Left: Active Question Area */}
        <div className="flex-1 flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div>
            {/* Question Metadata Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400">
                  {currentQuestion.topic_title}
                </span>
                <span className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                  {currentQuestion.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">
                  Marks: <strong className="text-white">+{currentQuestion.marks}</strong>
                </span>
                {saveStatus === "SAVED" && (
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Auto-saved
                  </span>
                )}
                {saveStatus === "SAVING" && (
                  <span className="text-slate-500 text-[11px]">Saving...</span>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div className="mb-6">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                Question {currentIndex + 1}
              </span>
              <p className="text-base font-medium text-white leading-relaxed whitespace-pre-wrap">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                currentQuestion.options.map((opt, idx) => {
                  const isSelected = responses[currentQuestion.question_id] === opt;
                  const letter = String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      disabled={isTimeExpired}
                      className={cn(
                        "w-full flex items-start gap-3.5 p-4 rounded-xl border text-left text-xs transition-all",
                        isSelected
                          ? "border-indigo-500/50 bg-indigo-600/15 text-white shadow-sm"
                          : "border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        )}
                      >
                        {letter}
                      </span>
                      <span className="mt-0.5 leading-relaxed">{opt}</span>
                    </button>
                  );
                })
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Type your answer:</label>
                  <input
                    type="text"
                    value={responses[currentQuestion.question_id] || ""}
                    onChange={(e) => handleSelectOption(e.target.value)}
                    placeholder="Enter short answer..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-6 mt-8">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <span>Next Question</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                <span>Review & Submit</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Question Navigation Palette */}
        <div className="w-full lg:w-72 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Question Palette
            </h3>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = responses[q.question_id] !== undefined && responses[q.question_id] !== null && responses[q.question_id] !== "";

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center border",
                      isCurrent
                        ? "border-indigo-400 bg-indigo-600 text-white ring-2 ring-indigo-500/30"
                        : isAnswered
                        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-[11px] border-t border-slate-800/80 pt-3 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-emerald-500/40 bg-emerald-950/40" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-slate-800 bg-slate-950/60" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-indigo-400 bg-indigo-600" />
                <span>Current</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Submit Mock Examination?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to finalize this timed mock simulation. Your responses will be scored server-side and will immediately recalculate your official Exam Readiness Score.
            </p>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                <div className="text-xs text-slate-400">Answered</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{answeredCount}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                <div className="text-xs text-slate-400">Unanswered</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{unansweredCount}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
              >
                <span>{isSubmitting ? "Scoring Responses..." : "Confirm & Submit"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expired Modal */}
      {isTimeExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Time Expired</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              The duration for this examination has elapsed. Your answers have been preserved and the exam is now submitting for server scoring.
            </p>
            <button
              onClick={handleAutoSubmitOnExpire}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {isSubmitting ? "Finalizing Submission..." : "View Results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
