"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileQuestion,
  Search,
  Shuffle,
  Calendar,
  Award,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Send,
  Save,
  Info,
  HelpCircle,
} from "lucide-react";
import type {
  TeacherAssessmentType,
  TeacherQuestion,
  TeacherSubject,
} from "@/types/database.types";

interface Props {
  subjects: TeacherSubject[];
  questionBank: TeacherQuestion[];
  isVerified: boolean;
  defaultSubjectId?: string;
}

interface SelectedQuestionItem {
  questionId: string;
  marks: number;
  question: TeacherQuestion;
}

export function TeacherAssessmentBuilderView({
  subjects,
  questionBank,
  isVerified,
  defaultSubjectId,
}: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState<number>(1);

  // Step 1: Basic Details
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [subjectId, setSubjectId] = React.useState(defaultSubjectId || subjects[0]?.id || "");
  const [assessmentType, setAssessmentType] = React.useState<TeacherAssessmentType>("EXAM");

  // Step 2: Selected Questions
  const [selectedQuestions, setSelectedQuestions] = React.useState<SelectedQuestionItem[]>([]);
  const [qSearchTerm, setQSearchTerm] = React.useState("");
  const [qTypeFilter, setQTypeFilter] = React.useState<string>("ALL");
  const [qDifficultyFilter, setQDifficultyFilter] = React.useState<string>("ALL");
  const [qStatusFilter, setQStatusFilter] = React.useState<string>("APPROVED");

  // Step 3: Exam Settings
  const [durationMinutes, setDurationMinutes] = React.useState<number>(60);
  const [passPercentage, setPassPercentage] = React.useState<number>(40);
  const [attemptLimit, setAttemptLimit] = React.useState<number>(1);
  const [scheduledStart, setScheduledStart] = React.useState<string>("");
  const [scheduledEnd, setScheduledEnd] = React.useState<string>("");
  const [shuffleQuestions, setShuffleQuestions] = React.useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = React.useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [showConfirmPublish, setShowConfirmPublish] = React.useState(false);

  // Filter candidate questions from question bank
  const filteredQuestionBank = React.useMemo(() => {
    return questionBank.filter((q) => {
      // Must match subject if question belongs to a subject
      if (q.subject_id && q.subject_id !== subjectId) return false;
      if (qStatusFilter !== "ALL" && q.status !== qStatusFilter) return false;
      if (qTypeFilter !== "ALL" && q.question_type !== qTypeFilter) return false;
      if (qDifficultyFilter !== "ALL" && q.difficulty !== qDifficultyFilter) return false;
      if (qSearchTerm.trim()) {
        const term = qSearchTerm.toLowerCase();
        const matchesText = q.question_text?.toLowerCase().includes(term);
        const matchesTopic = q.topic_id?.toLowerCase().includes(term);
        const matchesSubtopic = q.subtopic?.toLowerCase().includes(term);
        if (!matchesText && !matchesTopic && !matchesSubtopic) return false;
      }
      return true;
    });
  }, [questionBank, subjectId, qStatusFilter, qTypeFilter, qDifficultyFilter, qSearchTerm]);

  // Total marks calculation
  const totalCalculatedMarks = React.useMemo(() => {
    return selectedQuestions.reduce((sum, item) => sum + (item.marks || 1), 0);
  }, [selectedQuestions]);

  // Question selection handlers
  function handleToggleQuestion(q: TeacherQuestion) {
    setSelectedQuestions((prev) => {
      const exists = prev.find((item) => item.questionId === q.id);
      if (exists) {
        return prev.filter((item) => item.questionId !== q.id);
      } else {
        return [
          ...prev,
          {
            questionId: q.id,
            marks: q.marks || 1,
            question: q,
          },
        ];
      }
    });
  }

  function handleUpdateQuestionMarks(qId: string, marks: number) {
    const safeMarks = Math.max(1, marks || 1);
    setSelectedQuestions((prev) =>
      prev.map((item) => (item.questionId === qId ? { ...item, marks: safeMarks } : item))
    );
  }

  function handleMoveQuestion(index: number, direction: "up" | "down") {
    setSelectedQuestions((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  function handleRemoveQuestion(qId: string) {
    setSelectedQuestions((prev) => prev.filter((item) => item.questionId !== qId));
  }

  // Validate Step 1
  function validateStep1(): boolean {
    const errs: string[] = [];
    if (!title.trim()) errs.push("Assessment Title is required.");
    if (!subjectId) errs.push("Subject selection is required.");
    setValidationErrors(errs);
    return errs.length === 0;
  }

  // Validate Step 2
  function validateStep2(): boolean {
    const errs: string[] = [];
    if (selectedQuestions.length === 0) {
      errs.push("You must select at least one question for the assessment.");
    }
    setValidationErrors(errs);
    return errs.length === 0;
  }

  // Validate Step 3
  function validateStep3(): boolean {
    const errs: string[] = [];
    if (durationMinutes <= 0 || durationMinutes > 1440) {
      errs.push("Duration must be between 1 and 1440 minutes (24 hours).");
    }
    if (passPercentage < 0 || passPercentage > 100) {
      errs.push("Pass percentage must be between 0% and 100%.");
    }
    if (attemptLimit < 1) {
      errs.push("Attempt limit must be at least 1.");
    }
    if (scheduledStart && scheduledEnd) {
      if (new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()) {
        errs.push("Scheduled End Time must be strictly after the Scheduled Start Time.");
      }
    }
    setValidationErrors(errs);
    return errs.length === 0;
  }

  function handleNext() {
    setErrorMsg(null);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }

  function handleBack() {
    setErrorMsg(null);
    setValidationErrors([]);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSaveAssessment(publishImmediately = false) {
    setIsSubmitting(true);
    setErrorMsg(null);
    setValidationErrors([]);

    try {
      // 1. Create Assessment
      const selectedSubject = subjects.find((s) => s.id === subjectId);
      const res = await fetch("/api/teacher/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          organization_id: selectedSubject?.organization_id || null,
          title: title.trim(),
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          assessment_type: assessmentType,
          duration_minutes: durationMinutes,
          total_marks: totalCalculatedMarks,
          pass_percentage: passPercentage,
          scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
          attempt_limit: attemptLimit,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.reason || "Failed to create assessment");

      const createdAssessment = data.assessment;

      // 2. Attach Questions if any
      if (selectedQuestions.length > 0) {
        const attachRes = await fetch(`/api/teacher/assessments/${createdAssessment.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: selectedQuestions.map((item, idx) => ({
              questionId: item.questionId,
              marks: item.marks,
              displayOrder: idx + 1,
            })),
          }),
        });

        const attachData = await attachRes.json();
        if (!attachRes.ok) {
          throw new Error(attachData.error || "Failed to attach questions to assessment");
        }
      }

      // 3. Publish if requested
      if (publishImmediately) {
        const pubRes = await fetch(`/api/teacher/assessments/${createdAssessment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetStatus: "PUBLISHED" }),
        });

        const pubData = await pubRes.json();
        if (!pubRes.ok) {
          throw new Error(pubData.error || pubData.reason || "Failed to publish assessment");
        }
      }

      router.push(`/teacher/assessments/${createdAssessment.id}`);
    } catch (err: unknown) {
      console.error("[TeacherAssessmentBuilder] Save error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save assessment");
      setShowConfirmPublish(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedSubject = subjects.find((s) => s.id === subjectId);

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
            <span className="text-slate-300 font-semibold">New Assessment Builder</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create New Assessment</h1>
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "Questions" },
            { num: 3, label: "Settings" },
            { num: 4, label: "Review" },
          ].map((step) => (
            <div
              key={step.num}
              onClick={() => {
                if (step.num < currentStep) setCurrentStep(step.num);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                currentStep === step.num
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : currentStep > step.num
                  ? "text-emerald-400 hover:bg-slate-800/60"
                  : "text-slate-500 cursor-not-allowed"
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-slate-800 font-mono">
                {currentStep > step.num ? <Check className="w-2.5 h-2.5" /> : step.num}
              </span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Global Error Banner */}
      {(errorMsg || validationErrors.length > 0) && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span>Please resolve the following before proceeding:</span>
          </div>
          {errorMsg && <p className="pl-6 text-red-200">{errorMsg}</p>}
          {validationErrors.map((err, i) => (
            <p key={i} className="pl-6 text-red-200">
              • {err}
            </p>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: BASIC DETAILS */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-white">Step 1: Basic Information</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Define the core course identity, subject alignment, and instructions.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                Step 1 of 4
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assessment Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm Diagnostic Assessment: Lexical Analysis & Syntax"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Course / Subject <span className="text-red-400">*</span>
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) {s.organization_id ? "• Institutional" : "• Independent"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assessment Type
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as TeacherAssessmentType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="EXAM">Formal Exam / Midterm / Final</option>
                  <option value="QUIZ">Diagnostic Quiz / Checkpoint</option>
                  <option value="ASSIGNMENT">Graded Assignment</option>
                  <option value="DIAGNOSTIC">Pre-Learning Diagnostic</option>
                  <option value="MOCK">Readiness Mock Simulation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Overview / Objective (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief summary of syllabus coverage and pedagogical purpose..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Student Exam Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Detailed instructions shown to students before beginning (e.g. calculator policy, negative marking, attempt policies)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SELECT & ASSEMBLE QUESTIONS */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-white">Assemble Assessment Questions</h2>
              <p className="text-xs text-slate-400">
                Select approved items from the Question Bank. Reorder items and allocate marks.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Questions Selected</span>
                <span className="text-lg font-bold text-amber-400">{selectedQuestions.length}</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Total Marks</span>
                <span className="text-lg font-bold text-emerald-400">{totalCalculatedMarks} pts</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Question Bank Picker */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="glass-card border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white">Search Question Bank</CardTitle>
                  {/* Filters row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <div className="relative sm:col-span-3">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={qSearchTerm}
                        onChange={(e) => setQSearchTerm(e.target.value)}
                        placeholder="Search question text or topic..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <select
                      value={qStatusFilter}
                      onChange={(e) => setQStatusFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="APPROVED">Status: APPROVED Only</option>
                      <option value="ALL">Status: All Statuses</option>
                    </select>
                    <select
                      value={qTypeFilter}
                      onChange={(e) => setQTypeFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="ALL">All Question Types</option>
                      <option value="MCQ">Multiple Choice (MCQ)</option>
                      <option value="MULTI_SELECT">Multi-Select</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="CODING">Coding Problem</option>
                      <option value="SUBJECTIVE">Subjective</option>
                    </select>
                    <select
                      value={qDifficultyFilter}
                      onChange={(e) => setQDifficultyFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="ALL">All Difficulties</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                      <option value="EXPERT">Expert</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredQuestionBank.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No matching questions found in Question Bank for this subject.
                    </div>
                  ) : (
                    filteredQuestionBank.map((q) => {
                      const isSelected = selectedQuestions.some((s) => s.questionId === q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleQuestion(q)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500/40 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-amber-400 font-semibold">
                                {q.question_type}
                              </span>
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
                              <Badge
                                variant="outline"
                                className={`text-[9px] py-0 ${
                                  q.status === "APPROVED"
                                    ? "border-emerald-500/30 text-emerald-400"
                                    : "border-slate-700 text-slate-400"
                                }`}
                              >
                                {q.status}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 text-slate-200">{q.question_text}</p>
                            {q.subtopic && (
                              <span className="text-[10px] text-slate-500 block">
                                Subtopic: {q.subtopic}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-mono text-emerald-400">
                              {q.marks || 1} pts
                            </span>
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center border ${
                                isSelected
                                  ? "bg-amber-600 border-amber-500 text-slate-950 font-bold"
                                  : "border-slate-700 bg-slate-800"
                              }`}
                            >
                              {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-slate-400" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Ordered Paper Blueprint */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="glass-card border-slate-800 h-full flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white">Assessment Blueprint Order</CardTitle>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                      {selectedQuestions.length} Questions
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    Questions will appear to students in this sequence (unless randomization is enabled).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 flex-1 max-h-[480px] overflow-y-auto pr-1">
                  {selectedQuestions.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      Click questions from the left to attach them to this blueprint.
                    </div>
                  ) : (
                    selectedQuestions.map((item, idx) => (
                      <div
                        key={item.questionId}
                        className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-slate-500 font-bold text-xs w-5">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-slate-200 font-medium">{item.question.question_text}</p>
                          <span className="text-[10px] text-slate-500">
                            {item.question.question_type} • {item.question.difficulty}
                          </span>
                        </div>
                        {/* Marks Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.marks}
                            onChange={(e) =>
                              handleUpdateQuestionMarks(item.questionId, parseInt(e.target.value) || 1)
                            }
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-emerald-400 font-mono focus:outline-none"
                            title="Allocated Marks"
                          />
                          <span className="text-[10px] text-slate-500">pts</span>
                        </div>
                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, "down")}
                            disabled={idx === selectedQuestions.length - 1}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(item.questionId)}
                            className="p-1 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: EXAM SETTINGS */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-white">Step 3: Exam Parameters & Schedule</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Configure duration, availability window, attempt policies, and randomization.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                Step 3 of 4
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Duration (Minutes) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Maximum 1440 minutes (24h)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pass Percentage (%) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Award className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(parseInt(e.target.value) || 40)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Required: {Math.round((totalCalculatedMarks * passPercentage) / 100)} / {totalCalculatedMarks} pts
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Allowed Student Attempts <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={attemptLimit}
                  onChange={(e) => setAttemptLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 1 attempt</span>
              </div>
            </div>

            {/* Schedule Availability Window */}
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span>Scheduled Availability Window (Optional)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                If specified, students can only commence exam attempts between these timestamps.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Scheduled Start Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Scheduled End Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Randomization Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-start gap-3 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">Shuffle Question Order</span>
                  <span className="text-[11px] text-slate-400">
                    Randomizes question sequencing for each student attempt to prevent synchronized cheating.
                  </span>
                </div>
              </label>

              <label className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-start gap-3 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">Shuffle Answer Options</span>
                  <span className="text-[11px] text-slate-400">
                    Permutes the order of MCQ and multi-select answer keys per attempt.
                  </span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: REVIEW & PUBLISH */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-white">Step 4: Review Assessment Blueprint</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Verify blueprint integrity before saving as draft or publishing to students.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                Step 4 of 4
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overview Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">Assessment Title</span>
                <span className="text-sm font-semibold text-white truncate block">{title}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Subject</span>
                <span className="text-sm font-semibold text-emerald-400 truncate block">
                  {selectedSubject?.name || "Unassigned"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Questions & Marks</span>
                <span className="text-sm font-semibold text-amber-400 block">
                  {selectedQuestions.length} Questions ({totalCalculatedMarks} pts)
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Duration & Pass</span>
                <span className="text-sm font-semibold text-slate-200 block">
                  {durationMinutes} min • {passPercentage}% pass
                </span>
              </div>
            </div>

            {/* Questions Inspection Preview */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300">Attached Questions Breakdown</h3>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {selectedQuestions.map((item, idx) => (
                  <div
                    key={item.questionId}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                      <span className="truncate text-slate-300">{item.question.question_text}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">
                        {item.question.question_type}
                      </Badge>
                      <span className="font-mono text-emerald-400 text-xs font-semibold">
                        {item.marks} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Publication Warning Callout */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Publishing Safeguards</span>
                <p className="text-[11px] text-amber-200/80">
                  Publishing locks the question blueprint to preserve student attempt integrity. Ensure all questions and mark allocations are final. Draft assessments can be saved and edited anytime.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
          variant="outline"
          className="border-slate-800 text-slate-400 hover:text-white text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Button>

        <div className="flex items-center gap-3">
          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-medium text-xs gap-1.5"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => handleSaveAssessment(false)}
                disabled={isSubmitting}
                variant="outline"
                className="border-slate-700 text-slate-200 hover:border-amber-500/40 text-xs gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save as Draft</span>
              </Button>

              <Button
                type="button"
                onClick={() => setShowConfirmPublish(true)}
                disabled={isSubmitting || selectedQuestions.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Assessment</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Publication */}
      {showConfirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card className="glass-card border-slate-800 max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Confirm Assessment Publication</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Are you ready to publish &quot;{title}&quot;?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-300">
                Once published, this assessment with <strong>{selectedQuestions.length} questions</strong> and <strong>{totalCalculatedMarks} total marks</strong> will be finalized and become available to enrolled students within its scheduled availability window.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmPublish(false)}
                  disabled={isSubmitting}
                  className="border-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveAssessment(true)}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
                >
                  {isSubmitting ? "Publishing..." : "Confirm & Publish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
