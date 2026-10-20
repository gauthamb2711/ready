"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Award,
  Clock,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  Archive,
  Edit3,
  FileQuestion,
  Shuffle,
  Users,
  Info,
} from "lucide-react";
import type {
  TeacherAssessment,
  TeacherAssessmentQuestion,
  TeacherAssessmentStatus,
} from "@/types/database.types";

interface Props {
  initialAssessment: TeacherAssessment;
  initialQuestions: TeacherAssessmentQuestion[];
  isVerified: boolean;
}

export function TeacherAssessmentDetailView({
  initialAssessment,
  initialQuestions,
  isVerified,
}: Props) {
  const router = useRouter();
  const [assessment, setAssessment] = React.useState<TeacherAssessment>(initialAssessment);
  const [questions, setQuestions] = React.useState<TeacherAssessmentQuestion[]>(initialQuestions);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  async function handleStatusTransition(targetStatus: TeacherAssessmentStatus) {
    setIsUpdating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/teacher/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.reason || "Failed to update assessment status.");
      }

      setAssessment(data.assessment);
      setSuccessMsg(`Assessment status successfully updated to ${targetStatus}.`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Status transition failed.");
    } finally {
      setIsUpdating(false);
    }
  }

  const status = assessment.status;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/teacher/assessments" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Assessments</span>
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-semibold font-mono">
              #{assessment.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{assessment.title}</h1>
            <Badge
              variant="outline"
              className={`text-xs font-mono ${
                status === "PUBLISHED"
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                  : status === "CLOSED"
                  ? "border-red-500/30 text-red-400 bg-red-500/10"
                  : status === "ARCHIVED"
                  ? "border-slate-700 text-slate-400 bg-slate-900"
                  : "border-amber-500/30 text-amber-400 bg-amber-500/10"
              }`}
            >
              {status}
            </Badge>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
              {assessment.assessment_type}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {status === "DRAFT" && (
            <>
              <Link href={`/teacher/assessments/${assessment.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Assessment</span>
                </Button>
              </Link>

              <Button
                size="sm"
                onClick={() => handleStatusTransition("PUBLISHED")}
                disabled={isUpdating || !isVerified}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Assessment</span>
              </Button>
            </>
          )}

          {status === "PUBLISHED" && (
            <>
              <Link href={`/teacher/assessments/${assessment.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Settings</span>
                </Button>
              </Link>

              <Button
                size="sm"
                onClick={() => handleStatusTransition("CLOSED")}
                disabled={isUpdating || !isVerified}
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-950/30 text-xs gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Assessment</span>
              </Button>
            </>
          )}

          {status === "CLOSED" && (
            <Button
              size="sm"
              onClick={() => handleStatusTransition("PUBLISHED")}
              disabled={isUpdating || !isVerified}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Reopen Assessment</span>
            </Button>
          )}

          {status !== "ARCHIVED" && (
            <Button
              size="sm"
              onClick={() => handleStatusTransition("ARCHIVED")}
              disabled={isUpdating || !isVerified}
              variant="outline"
              className="border-slate-800 text-slate-400 hover:text-slate-200 text-xs gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Duration</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-base font-bold text-white">{assessment.duration_minutes}m</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Total Marks</span>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-base font-bold text-emerald-400">{assessment.total_marks} pts</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Pass Mark</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-white">{assessment.pass_percentage}%</span>
            <span className="text-[10px] text-slate-500">
              ({Math.round((assessment.total_marks * assessment.pass_percentage) / 100)} pts)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Questions</span>
          <div className="flex items-center gap-1.5">
            <FileQuestion className="w-4 h-4 text-indigo-400" />
            <span className="text-base font-bold text-white">{questions.length} items</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Max Attempts</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-base font-bold text-white">{assessment.attempt_limit}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Randomization</span>
          <div className="flex items-center gap-1 text-[11px]">
            <span className={assessment.shuffle_questions ? "text-emerald-400" : "text-slate-500"}>
              {assessment.shuffle_questions ? "Questions: ON" : "Questions: OFF"}
            </span>
          </div>
        </div>
      </div>

      {/* Schedule Window if present */}
      {(assessment.scheduled_start || assessment.scheduled_end) && (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Scheduled Exam Window:</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <span>
              Start: {assessment.scheduled_start ? new Date(assessment.scheduled_start).toLocaleString() : "Immediate"}
            </span>
            <span>•</span>
            <span>
              End: {assessment.scheduled_end ? new Date(assessment.scheduled_end).toLocaleString() : "No Expiry"}
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {assessment.instructions && (
        <Card className="glass-card border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Student Exam Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-300 whitespace-pre-line font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              {assessment.instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Questions Section */}
      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-white">Assessment Questions ({questions.length})</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Detailed paper layout and question marks distribution.
              </CardDescription>
            </div>
            {status === "DRAFT" && (
              <Link href={`/teacher/assessments/${assessment.id}/edit`}>
                <Button size="sm" variant="outline" className="border-slate-700 text-xs text-slate-300">
                  Manage Questions
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No questions currently attached to this assessment.
            </div>
          ) : (
            questions.map((item, idx) => {
              const q = item.question;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 font-bold font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {item.display_order || idx + 1}
                      </span>
                      <div className="space-y-1">
                        <p className="text-white font-medium text-sm leading-snug">
                          {q?.question_text || "Question Text Unavailable"}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          {q?.question_type && (
                            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                              {q.question_type}
                            </Badge>
                          )}
                          {q?.difficulty && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                q.difficulty === "HARD"
                                  ? "border-red-500/30 text-red-400"
                                  : q.difficulty === "MEDIUM"
                                  ? "border-amber-500/30 text-amber-400"
                                  : "border-emerald-500/30 text-emerald-400"
                              }`}
                            >
                              {q.difficulty}
                            </Badge>
                          )}
                          {q?.subtopic && (
                            <span className="text-[10px] text-slate-500">
                              Subtopic: {q.subtopic}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {item.marks} pts
                      </span>
                    </div>
                  </div>

                  {/* Options Preview (if MCQ / Options present) */}
                  {Array.isArray(q?.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                      {q.options.map((opt: any, oIdx: number) => (
                        <div
                          key={opt.id || oIdx}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2"
                        >
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 font-mono text-[9px] flex items-center justify-center">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="truncate">{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
