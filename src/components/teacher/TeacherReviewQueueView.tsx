"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  X,
  FileQuestion,
  AlertCircle,
  History,
  Clock,
  Sparkles,
  Inbox,
  ArrowRight,
} from "lucide-react";
import type { TeacherQuestion, TeacherQuestionStatus, TeacherSubject } from "@/types/database.types";

interface AuditLogItem {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
  created_at: string;
}

interface Props {
  pendingQuestions: TeacherQuestion[];
  subjects: TeacherSubject[];
  isVerified: boolean;
}

export function TeacherReviewQueueView({
  pendingQuestions: initialPending,
  subjects,
  isVerified,
}: Props) {
  const router = useRouter();
  const [questions, setQuestions] = React.useState<TeacherQuestion[]>(initialPending);
  const [selectedId, setSelectedId] = React.useState<string>(
    initialPending[0]?.id || ""
  );
  const [auditLogs, setAuditLogs] = React.useState<AuditLogItem[]>([]);
  const [transitioning, setTransitioning] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const currentQuestion = React.useMemo(() => {
    return questions.find((q) => q.id === selectedId) || questions[0] || null;
  }, [questions, selectedId]);

  const currentSubject = React.useMemo(() => {
    if (!currentQuestion) return null;
    return subjects.find((s) => s.id === currentQuestion.subject_id) || null;
  }, [currentQuestion, subjects]);

  // Load audit logs when currentQuestion changes
  React.useEffect(() => {
    if (!currentQuestion) {
      setAuditLogs([]);
      return;
    }
    fetch(`/api/teacher/questions/${currentQuestion.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.auditLogs) setAuditLogs(d.auditLogs);
      })
      .catch(() => {});
  }, [currentQuestion?.id]);

  async function handleStatusTransition(
    targetStatus: TeacherQuestionStatus,
    options?: { rejectionReason?: string }
  ) {
    if (!currentQuestion) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setTransitioning(true);

    try {
      const res = await fetch(`/api/teacher/questions/${currentQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          rejectionReason: options?.rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update question status");
      }

      setSuccessMsg(`Question transitioned to ${targetStatus}!`);
      setShowRejectModal(false);
      setRejectionReason("");

      // Remove from pending review queue
      const remaining = questions.filter((q) => q.id !== currentQuestion.id);
      setQuestions(remaining);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Review action failed");
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/teacher/questions" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Question Bank</span>
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-semibold">Review Queue</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Questions Review Queue</h1>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 font-mono text-xs">
              {questions.length} Pending
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Institutional and departmental quality review station. Verify question accuracy, taxonomy, and rationales before assessment deployment.
          </p>
        </div>

        <Link href="/teacher/questions">
          <Button variant="outline" size="sm" className="text-xs border-slate-700">
            Back to Question Bank
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-4 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {questions.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/60 p-12 text-center">
          <Inbox className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">Review Queue Empty</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            All submitted questions have been reviewed. Authors can submit new questions for review from the Question Bank.
          </p>
          <Link href="/teacher/questions">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
              Go to Question Bank
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Queue List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Pending Items ({questions.length})
            </div>
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {questions.map((q) => {
                const isSelected = q.id === selectedId;
                const subj = subjects.find((s) => s.id === q.subject_id);

                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all space-y-2 ${
                      isSelected
                        ? "border-amber-500/80 bg-amber-950/20"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        #{q.id.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] py-0 border-slate-700 text-slate-300">
                          {q.question_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0 ${
                            q.difficulty === "HARD"
                              ? "border-red-500/30 text-red-400"
                              : q.difficulty === "MEDIUM"
                              ? "border-amber-500/30 text-amber-400"
                              : "border-emerald-500/30 text-emerald-400"
                          }`}
                        >
                          {q.difficulty}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-xs text-white font-medium line-clamp-2 leading-snug">
                      {q.question_text}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{subj?.name || "Subject"}</span>
                      <span>{q.marks} Mark{q.marks > 1 ? "s" : ""}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Review Detail Panel */}
          {currentQuestion && (
            <div className="lg:col-span-2 space-y-6">
              {/* Review Actions Card */}
              <Card className="glass-card border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm text-white">Reviewer Decision</CardTitle>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                      STATUS: REVIEW
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Evaluate this question item according to institutional syllabus and learning standards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => handleStatusTransition("APPROVED")}
                      disabled={transitioning || !isVerified}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Question</span>
                    </Button>

                    <Button
                      onClick={() => setShowRejectModal(true)}
                      disabled={transitioning || !isVerified}
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-950/30 text-xs gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject (With Reason)</span>
                    </Button>

                    <Button
                      onClick={() => handleStatusTransition("DRAFT")}
                      disabled={transitioning || !isVerified}
                      variant="ghost"
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Return to Draft
                    </Button>
                  </div>

                  {showRejectModal && (
                    <div className="p-4 rounded-xl border border-red-900/60 bg-red-950/30 space-y-3">
                      <span className="text-xs font-semibold text-red-300">
                        Reason for Rejection *
                      </span>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        placeholder="State clearly why the question was rejected and what the author should revise..."
                        className="w-full rounded-lg border border-red-900/60 bg-slate-900 p-2 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowRejectModal(false)}
                          className="text-xs border-slate-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!rejectionReason.trim() || transitioning}
                          onClick={() => handleStatusTransition("REJECTED", { rejectionReason })}
                          className="bg-red-600 hover:bg-red-500 text-white text-xs"
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Full Question Detail */}
              <Card className="border-slate-800 bg-slate-950/60">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentSubject && (
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {currentSubject.name}
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                      {currentQuestion.question_type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        currentQuestion.difficulty === "HARD"
                          ? "border-red-500/30 text-red-400"
                          : currentQuestion.difficulty === "MEDIUM"
                          ? "border-amber-500/30 text-amber-400"
                          : "border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-400">
                      {currentQuestion.cognitive_level}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">
                      {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? "s" : ""}
                    </span>
                  </div>
                  {currentQuestion.subtopic && (
                    <div className="text-xs text-slate-400 pt-1">
                      Subtopic: <span className="text-slate-200">{currentQuestion.subtopic}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Question Text */}
                  <div className="rounded-lg bg-slate-900/50 p-4 border border-slate-800">
                    <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Question Text</h4>
                    <p className="text-sm font-medium text-white leading-relaxed whitespace-pre-wrap">
                      {currentQuestion.question_text}
                    </p>
                  </div>

                  {/* Options */}
                  {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase font-semibold text-slate-400">Options</h4>
                      <div className="space-y-2">
                        {currentQuestion.options.map((opt, i) => {
                          const correctIds = currentQuestion.correct_answer
                            ? currentQuestion.correct_answer.split(",").map((s) => s.trim())
                            : [];
                          const isCorrect =
                            correctIds.includes(opt.id) ||
                            correctIds.includes(opt.text) ||
                            opt.is_correct === true;

                          return (
                            <div
                              key={opt.id || i}
                              className={`rounded-lg p-3 border flex items-center justify-between ${
                                isCorrect
                                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
                                  : "border-slate-800 bg-slate-900/30 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold text-slate-500">
                                  {String.fromCharCode(65 + i)}.
                                </span>
                                <span className="text-xs">{opt.text}</span>
                              </div>
                              {isCorrect && (
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                                  Correct Answer
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Correct Answer Display for non-MCQ */}
                  {!["MCQ", "MULTIPLE_SELECT"].includes(currentQuestion.question_type) && (
                    <div className="rounded-lg bg-emerald-950/15 border border-emerald-900/40 p-4">
                      <h4 className="text-xs uppercase font-semibold text-emerald-400 mb-1">
                        Model Correct Answer Key
                      </h4>
                      <p className="text-xs text-emerald-200 font-mono whitespace-pre-wrap">
                        {currentQuestion.correct_answer || "(None specified)"}
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  {currentQuestion.explanation && (
                    <div className="rounded-lg bg-slate-900/40 border border-slate-800 p-4">
                      <h4 className="text-xs uppercase font-semibold text-slate-400 mb-1">
                        Pedagogical Explanation
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}

                  {/* Quality Checklist */}
                  {currentQuestion.quality_report && (
                    <div className="rounded-lg border border-slate-800/80 bg-slate-900/20 p-4 space-y-2">
                      <h4 className="text-xs uppercase font-semibold text-slate-400">
                        Quality Diagnostic Status: {currentQuestion.quality_status}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                        <div>
                          Text Invariant:{" "}
                          <span className={currentQuestion.quality_report.details?.hasText ? "text-emerald-400" : "text-red-400"}>
                            {currentQuestion.quality_report.details?.hasText ? "VALID" : "EMPTY"}
                          </span>
                        </div>
                        <div>
                          Topic Linked:{" "}
                          <span className={currentQuestion.quality_report.details?.hasTopic ? "text-emerald-400" : "text-red-400"}>
                            {currentQuestion.quality_report.details?.hasTopic ? "LINKED" : "MISSING"}
                          </span>
                        </div>
                        <div>
                          Options & Answer:{" "}
                          <span className={currentQuestion.quality_report.details?.validOptions !== false ? "text-emerald-400" : "text-red-400"}>
                            {currentQuestion.quality_report.details?.validOptions !== false ? "VALID" : "INVALID"}
                          </span>
                        </div>
                        <div>
                          Duplicate:{" "}
                          <span className={currentQuestion.quality_report.details?.duplicateReference ? "text-amber-400" : "text-emerald-400"}>
                            {currentQuestion.quality_report.details?.duplicateReference ? "POSSIBLE" : "NONE"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Author & Organization info */}
                  <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-xs text-slate-500">
                    <div>
                      Author: <span className="font-mono text-slate-400">{currentQuestion.owner_id.slice(0, 8)}</span>
                    </div>
                    <div>
                      Created: {new Date(currentQuestion.created_at).toISOString().split("T")[0]}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audit History Card */}
              {auditLogs.length > 0 && (
                <Card className="border-slate-800 bg-slate-950/60">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-indigo-400" />
                      <CardTitle className="text-sm text-white">Question Event History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300 font-mono">
                            {log.action}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            Actor: <span className="font-mono text-slate-300">{log.actor_id.slice(0, 8)}</span>
                          </span>
                          {log.details?.rejectionReason && (
                            <span className="text-[11px] text-red-400">
                              Reason: {log.details.rejectionReason}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.created_at).toISOString().replace("T", " ").slice(0, 19)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
