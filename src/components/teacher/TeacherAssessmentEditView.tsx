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
  Save,
  CheckCircle2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Search,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import type {
  TeacherAssessment,
  TeacherAssessmentQuestion,
  TeacherAssessmentType,
  TeacherQuestion,
} from "@/types/database.types";

interface Props {
  initialAssessment: TeacherAssessment;
  initialQuestions: TeacherAssessmentQuestion[];
  questionBank: TeacherQuestion[];
  isVerified: boolean;
}

export function TeacherAssessmentEditView({
  initialAssessment,
  initialQuestions,
  questionBank,
  isVerified,
}: Props) {
  const router = useRouter();

  // Basic Details
  const [title, setTitle] = React.useState(initialAssessment.title);
  const [description, setDescription] = React.useState(initialAssessment.description || "");
  const [instructions, setInstructions] = React.useState(initialAssessment.instructions || "");
  const [assessmentType, setAssessmentType] = React.useState<TeacherAssessmentType>(
    initialAssessment.assessment_type || "EXAM"
  );

  // Settings
  const [durationMinutes, setDurationMinutes] = React.useState<number>(
    initialAssessment.duration_minutes || 60
  );
  const [passPercentage, setPassPercentage] = React.useState<number>(
    initialAssessment.pass_percentage || 40
  );
  const [attemptLimit, setAttemptLimit] = React.useState<number>(
    initialAssessment.attempt_limit || 1
  );
  const [scheduledStart, setScheduledStart] = React.useState<string>(
    initialAssessment.scheduled_start ? initialAssessment.scheduled_start.slice(0, 16) : ""
  );
  const [scheduledEnd, setScheduledEnd] = React.useState<string>(
    initialAssessment.scheduled_end ? initialAssessment.scheduled_end.slice(0, 16) : ""
  );
  const [shuffleQuestions, setShuffleQuestions] = React.useState<boolean>(
    initialAssessment.shuffle_questions || false
  );
  const [shuffleOptions, setShuffleOptions] = React.useState<boolean>(
    initialAssessment.shuffle_options || false
  );

  // Questions Management
  const [attachedQuestions, setAttachedQuestions] = React.useState<
    Array<{ questionId: string; marks: number; question: TeacherQuestion }>
  >(
    initialQuestions.map((iq) => ({
      questionId: iq.question_id,
      marks: iq.marks || 1,
      question: iq.question || {
        id: iq.question_id,
        question_text: "Attached Question",
        question_type: "MCQ",
        difficulty: "MEDIUM",
        marks: iq.marks || 1,
        status: "APPROVED",
      } as any,
    }))
  );

  // Bank search for adding questions
  const [qSearchTerm, setQSearchTerm] = React.useState("");
  const [showAddQuestions, setShowAddQuestions] = React.useState(false);

  // Submission state
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const totalCalculatedMarks = React.useMemo(() => {
    return attachedQuestions.reduce((sum, item) => sum + (item.marks || 1), 0);
  }, [attachedQuestions]);

  const candidateBank = React.useMemo(() => {
    const attachedIds = new Set(attachedQuestions.map((q) => q.questionId));
    return questionBank.filter((q) => {
      if (attachedIds.has(q.id)) return false;
      if (initialAssessment.subject_id && q.subject_id && q.subject_id !== initialAssessment.subject_id) return false;
      if (qSearchTerm.trim()) {
        const term = qSearchTerm.toLowerCase();
        return (
          q.question_text?.toLowerCase().includes(term) ||
          q.subtopic?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [questionBank, attachedQuestions, initialAssessment.subject_id, qSearchTerm]);

  function handleAttachFromBank(q: TeacherQuestion) {
    setAttachedQuestions((prev) => [
      ...prev,
      {
        questionId: q.id,
        marks: q.marks || 1,
        question: q,
      },
    ]);
  }

  function handleRemoveQuestion(qId: string) {
    setAttachedQuestions((prev) => prev.filter((item) => item.questionId !== qId));
  }

  function handleMoveQuestion(index: number, direction: "up" | "down") {
    setAttachedQuestions((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  function handleUpdateMarks(qId: string, marks: number) {
    const safeMarks = Math.max(1, marks || 1);
    setAttachedQuestions((prev) =>
      prev.map((item) => (item.questionId === qId ? { ...item, marks: safeMarks } : item))
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!title.trim()) throw new Error("Assessment title cannot be empty.");
      if (durationMinutes <= 0 || durationMinutes > 1440) {
        throw new Error("Duration must be between 1 and 1440 minutes.");
      }
      if (passPercentage < 0 || passPercentage > 100) {
        throw new Error("Pass percentage must be between 0% and 100%.");
      }
      if (scheduledStart && scheduledEnd) {
        if (new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()) {
          throw new Error("Scheduled end time must be after start time.");
        }
      }

      // 1. Update basic settings
      const res = await fetch(`/api/teacher/assessments/${initialAssessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          assessment_type: assessmentType,
          duration_minutes: durationMinutes,
          pass_percentage: passPercentage,
          scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
          attempt_limit: attemptLimit,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update assessment settings.");

      // 2. Sync attached questions if draft
      if (initialAssessment.status === "DRAFT") {
        if (attachedQuestions.length > 0) {
          const syncRes = await fetch(`/api/teacher/assessments/${initialAssessment.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questions: attachedQuestions.map((q, idx) => ({
                questionId: q.questionId,
                marks: q.marks,
                displayOrder: idx + 1,
              })),
            }),
          });
          const syncData = await syncRes.json();
          if (!syncRes.ok) throw new Error(syncData.error || "Failed to update questions list.");
        }
      }

      setSuccessMsg("Assessment changes saved successfully.");
      router.push(`/teacher/assessments/${initialAssessment.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const isPublished = initialAssessment.status === "PUBLISHED";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link
              href={`/teacher/assessments/${initialAssessment.id}`}
              className="hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Assessment</span>
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-semibold">Edit Assessment</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Edit Assessment Blueprint</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/teacher/assessments/${initialAssessment.id}`}>
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-400 text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isVerified}
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-medium text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </Button>
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

      {/* Published Notice */}
      {isPublished && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold block">Assessment is Live / Published</span>
            <p className="text-[11px] text-amber-200/80">
              Exam settings, schedule, and instructions can be updated. Destructive modifications to question assignments are locked to prevent corrupting student submission attempts.
            </p>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base text-white">Assessment Parameters</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Configure examination metadata and runtime settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Assessment Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assessment Type</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value as TeacherAssessmentType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="EXAM">Formal Exam / Midterm</option>
                <option value="QUIZ">Diagnostic Quiz</option>
                <option value="ASSIGNMENT">Graded Assignment</option>
                <option value="DIAGNOSTIC">Pre-Learning Diagnostic</option>
                <option value="MOCK">Readiness Mock</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Attempts</label>
              <input
                type="number"
                min="1"
                max="10"
                value={attemptLimit}
                onChange={(e) => setAttemptLimit(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                max="1440"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pass Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={passPercentage}
                onChange={(e) => setPassPercentage(parseInt(e.target.value) || 40)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Schedule Window */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Start</label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled End</label>
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
            />
          </div>

          {/* Randomization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500"
              />
              <span className="text-xs text-slate-300">Shuffle Question Order</span>
            </label>

            <label className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500"
              />
              <span className="text-xs text-slate-300">Shuffle Answer Options</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Questions Blueprint Management */}
      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-white">
                Questions Layout ({attachedQuestions.length} Items • {totalCalculatedMarks} pts)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Adjust allocated marks and sequencing order.
              </CardDescription>
            </div>
            {!isPublished && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddQuestions(!showAddQuestions)}
                className="border-slate-700 text-xs text-amber-300 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddQuestions ? "Hide Bank" : "Add From Bank"}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question Bank Add Dropdown */}
          {showAddQuestions && !isPublished && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Add Questions from Question Bank</span>
                <input
                  type="text"
                  value={qSearchTerm}
                  onChange={(e) => setQSearchTerm(e.target.value)}
                  placeholder="Filter available questions..."
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {candidateBank.length === 0 ? (
                  <p className="text-xs text-slate-500">No additional questions found.</p>
                ) : (
                  candidateBank.map((q) => (
                    <div
                      key={q.id}
                      className="p-2 rounded bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2"
                    >
                      <p className="truncate flex-1 text-slate-300">{q.question_text}</p>
                      <span className="font-mono text-emerald-400 text-[10px]">{q.marks || 1} pts</span>
                      <Button
                        size="sm"
                        onClick={() => handleAttachFromBank(q)}
                        className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-500 text-slate-950 font-medium"
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Current Attached List */}
          <div className="space-y-2">
            {attachedQuestions.map((item, idx) => (
              <div
                key={item.questionId}
                className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between gap-2"
              >
                <span className="font-mono text-slate-500 font-bold w-5">#{idx + 1}</span>
                <p className="truncate flex-1 text-slate-200">{item.question.question_text}</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={item.marks}
                    disabled={isPublished}
                    onChange={(e) => handleUpdateMarks(item.questionId, parseInt(e.target.value) || 1)}
                    className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-emerald-400 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
                {!isPublished && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, "down")}
                      disabled={idx === attachedQuestions.length - 1}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(item.questionId)}
                      className="p-1 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
