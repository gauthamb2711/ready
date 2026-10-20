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
  Archive,
  Send,
  Check,
  X,
  FileQuestion,
  AlertCircle,
  Edit,
  History,
  Clock,
  Sparkles,
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
  question: TeacherQuestion;
  subject: TeacherSubject | null;
  isVerified: boolean;
  auditLogs?: AuditLogItem[];
}

export function TeacherQuestionReviewView({
  question,
  subject,
  isVerified,
  auditLogs = [],
}: Props) {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = React.useState<TeacherQuestion>(question);
  const [logs, setLogs] = React.useState<AuditLogItem[]>(auditLogs);
  const [transitioning, setTransitioning] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Rejection dialog state
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");

  async function handleStatusTransition(
    targetStatus: TeacherQuestionStatus,
    options?: { rejectionReason?: string; reviewNotes?: string }
  ) {
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
          reviewNotes: options?.reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update question status");
      }

      setCurrentQuestion(data.question);
      setSuccessMsg(`Status updated to ${targetStatus}!`);
      setShowRejectModal(false);
      setRejectionReason("");

      // Refresh audit logs
      fetch(`/api/teacher/questions/${currentQuestion.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.auditLogs) setLogs(d.auditLogs);
        })
        .catch(() => {});
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Status transition failed");
    } finally {
      setTransitioning(false);
    }
  }

  const { status, quality_status, quality_report } = currentQuestion;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/teacher/questions" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Question Bank</span>
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-semibold font-mono">
              #{currentQuestion.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Question Detail & Review</h1>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                status === "APPROVED"
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                  : status === "REVIEW"
                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                  : status === "REJECTED"
                  ? "border-red-500/30 text-red-400 bg-red-500/10"
                  : status === "QUALITY_CHECK"
                  ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              {status}
            </Badge>
          </div>
        </div>

        {/* Quality Check Status */}
        <div className="flex items-center gap-2">
          {quality_status === "PASS" && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Quality: PASS</span>
            </div>
          )}
          {quality_status === "WARNING" && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs text-amber-400 font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>Quality: WARNING</span>
            </div>
          )}
          {quality_status === "FAIL" && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs text-red-400 font-medium">
              <XCircle className="h-4 w-4" />
              <span>Quality: FAIL</span>
            </div>
          )}
        </div>
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

      {/* Rejection Notice Banner (if REJECTED) */}
      {status === "REJECTED" && currentQuestion.rejection_reason && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
            <XCircle className="h-4 w-4 text-red-400" />
            <span>Rejection Reason</span>
          </div>
          <p className="text-xs text-red-200/90 pl-6 leading-relaxed">
            {currentQuestion.rejection_reason}
          </p>
          {currentQuestion.reviewed_at && (
            <div className="text-[10px] text-slate-500 pl-6 pt-1">
              Reviewed on {currentQuestion.reviewed_at.split("T")[0]}
            </div>
          )}
        </div>
      )}

      {/* Lifecycle Transition Action Bar */}
      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Lifecycle & Authorization Actions</CardTitle>
          <CardDescription className="text-xs">
            Server-side governed transitions according to the READY quality pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            {/* Edit Draft button (allowed for DRAFT, QUALITY_CHECK, REJECTED) */}
            {["DRAFT", "QUALITY_CHECK", "REJECTED"].includes(status) && (
              <Link href={`/teacher/questions/${currentQuestion.id}/edit`}>
                <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300 gap-1.5">
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit Content</span>
                </Button>
              </Link>
            )}

            {/* DRAFT transitions */}
            {status === "DRAFT" && (
              <>
                <Button
                  onClick={() => handleStatusTransition("QUALITY_CHECK")}
                  disabled={transitioning || !isVerified}
                  variant="outline"
                  className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/20 text-xs gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Run Quality Check</span>
                </Button>
                <Button
                  onClick={() => handleStatusTransition("REVIEW")}
                  disabled={transitioning || !isVerified}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-medium text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit for Review</span>
                </Button>
              </>
            )}

            {/* QUALITY_CHECK transitions */}
            {status === "QUALITY_CHECK" && (
              <>
                <Button
                  onClick={() => handleStatusTransition("REVIEW")}
                  disabled={transitioning || !isVerified}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-medium text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit for Review</span>
                </Button>
                <Button
                  onClick={() => handleStatusTransition("DRAFT")}
                  disabled={transitioning || !isVerified}
                  variant="ghost"
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Return to Draft
                </Button>
              </>
            )}

            {/* REVIEW transitions */}
            {status === "REVIEW" && (
              <>
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
                  <span>Reject (Requires Reason)</span>
                </Button>

                <Button
                  onClick={() => handleStatusTransition("DRAFT")}
                  disabled={transitioning || !isVerified}
                  variant="ghost"
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Return to Draft
                </Button>
              </>
            )}

            {/* APPROVED transitions */}
            {status === "APPROVED" && (
              <>
                <Button
                  onClick={() => handleStatusTransition("ARCHIVED")}
                  disabled={transitioning || !isVerified}
                  variant="outline"
                  className="border-slate-700 text-slate-400 hover:text-amber-300 text-xs gap-1.5"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archive Question</span>
                </Button>
                <span className="text-[11px] text-emerald-400/80 italic ml-2">
                  Question approved & ready for assessment use.
                </span>
              </>
            )}

            {/* REJECTED transitions */}
            {status === "REJECTED" && (
              <>
                <Button
                  onClick={() => handleStatusTransition("DRAFT")}
                  disabled={transitioning || !isVerified}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  Return to Draft
                </Button>
                <Button
                  onClick={() => handleStatusTransition("ARCHIVED")}
                  disabled={transitioning || !isVerified}
                  variant="outline"
                  className="border-slate-700 text-slate-400 text-xs"
                >
                  Archive
                </Button>
              </>
            )}

            {/* ARCHIVED notice */}
            {status === "ARCHIVED" && (
              <span className="text-xs text-slate-500 italic">
                This question is archived. It cannot be used in new assessments unless unarchived.
              </span>
            )}
          </div>

          {/* Rejection Modal Box */}
          {showRejectModal && (
            <div className="mt-4 p-4 rounded-xl border border-red-900/60 bg-red-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-300">
                  Provide Reason for Rejection *
                </span>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain the required pedagogical or structural corrections..."
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

      {/* Question Details Card */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {subject && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {subject.name}
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
            {currentQuestion.estimated_time && (
              <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                {currentQuestion.estimated_time}s
              </span>
            )}
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

          {/* Options / Answer */}
          {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-semibold text-slate-400">Answer Options</h4>
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
                Model Correct Answer Key / Solution
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
                Pedagogical Explanation / Rubric Notes
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Tags */}
          {Array.isArray(currentQuestion.tags) && currentQuestion.tags.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs uppercase font-semibold text-slate-400">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {currentQuestion.tags.map((t, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quality Report details */}
          {quality_report && (
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/20 p-4 space-y-2">
              <h4 className="text-xs uppercase font-semibold text-slate-400">Quality Diagnostic Report</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                <div>
                  Text Invariant:{" "}
                  <span className={quality_report.details?.hasText ? "text-emerald-400" : "text-red-400"}>
                    {quality_report.details?.hasText ? "VALID" : "EMPTY"}
                  </span>
                </div>
                <div>
                  Topic Linked:{" "}
                  <span className={quality_report.details?.hasTopic ? "text-emerald-400" : "text-red-400"}>
                    {quality_report.details?.hasTopic ? "LINKED" : "MISSING"}
                  </span>
                </div>
                <div>
                  Options & Answer:{" "}
                  <span className={quality_report.details?.validOptions !== false ? "text-emerald-400" : "text-red-400"}>
                    {quality_report.details?.validOptions !== false ? "VALID" : "INVALID"}
                  </span>
                </div>
                <div>
                  Duplicate:{" "}
                  <span className={quality_report.details?.duplicateReference ? "text-amber-400" : "text-emerald-400"}>
                    {quality_report.details?.duplicateReference ? "POSSIBLE" : "NONE"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit History Timeline */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-400" />
            <CardTitle className="text-sm text-white">Audit History & Lifecycle Event Trail</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Immutable log of all changes and authorization state transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No audit records recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => (
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
