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
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  Tag,
  Save,
  Send,
} from "lucide-react";
import type {
  CognitiveLevel,
  TeacherDifficulty,
  TeacherQuestion,
  TeacherQuestionOption,
  TeacherQuestionType,
  TeacherSubject,
} from "@/types/database.types";
import { validateQuestionQuality } from "@/lib/intelligence/teacher-quality";

interface Props {
  subjects: TeacherSubject[];
  preselectedSubjectId?: string;
  preselectedTopicId?: string;
  preselectedUnitId?: string;
  existingQuestions: Array<{ id: string; question_text: string }>;
  initialQuestion?: TeacherQuestion;
}

export function TeacherQuestionEditor({
  subjects,
  preselectedSubjectId,
  preselectedTopicId,
  preselectedUnitId,
  existingQuestions,
  initialQuestion,
}: Props) {
  const router = useRouter();

  const isEditing = Boolean(initialQuestion);
  const [subjectId, setSubjectId] = React.useState(
    initialQuestion?.subject_id || preselectedSubjectId || subjects[0]?.id || ""
  );
  const [unitId, setUnitId] = React.useState(initialQuestion?.unit_id || preselectedUnitId || "");
  const [topicId, setTopicId] = React.useState(initialQuestion?.topic_id || preselectedTopicId || "");
  const [subtopic, setSubtopic] = React.useState(initialQuestion?.subtopic || "");
  const [questionType, setQuestionType] = React.useState<TeacherQuestionType>(
    initialQuestion?.question_type || "MCQ"
  );
  const [questionText, setQuestionText] = React.useState(initialQuestion?.question_text || "");
  const [scenarioContext, setScenarioContext] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<TeacherDifficulty>(
    initialQuestion?.difficulty || "MEDIUM"
  );
  const [cognitiveLevel, setCognitiveLevel] = React.useState<CognitiveLevel>(
    initialQuestion?.cognitive_level || "UNDERSTAND"
  );
  const [marks, setMarks] = React.useState(initialQuestion?.marks || 1);
  const [estimatedTime, setEstimatedTime] = React.useState(initialQuestion?.estimated_time || 60);
  const [tagsInput, setTagsInput] = React.useState(
    Array.isArray(initialQuestion?.tags) ? initialQuestion.tags.join(", ") : ""
  );
  const [explanation, setExplanation] = React.useState(initialQuestion?.explanation || "");
  const [correctAnswer, setCorrectAnswer] = React.useState(
    initialQuestion?.correct_answer || (questionType === "TRUE_FALSE" ? "true" : "opt_1")
  );

  // Selected correct IDs for MULTIPLE_SELECT
  const [selectedMultipleCorrect, setSelectedMultipleCorrect] = React.useState<string[]>(() => {
    if (initialQuestion?.question_type === "MULTIPLE_SELECT" && initialQuestion.correct_answer) {
      return initialQuestion.correct_answer.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return ["opt_1"];
  });

  // Options for MCQ / Multiple Select
  const [options, setOptions] = React.useState<TeacherQuestionOption[]>(() => {
    if (initialQuestion && Array.isArray(initialQuestion.options) && initialQuestion.options.length > 0) {
      return initialQuestion.options;
    }
    return [
      { id: "opt_1", text: "", is_correct: true },
      { id: "opt_2", text: "", is_correct: false },
      { id: "opt_3", text: "", is_correct: false },
      { id: "opt_4", text: "", is_correct: false },
    ];
  });

  // Curriculum topics for chosen subject
  const [topics, setTopics] = React.useState<Array<{ id: string; title: string; unit_id?: string }>>([]);
  const [loadingCurriculum, setLoadingCurriculum] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  // Fetch curriculum topics whenever subject changes
  React.useEffect(() => {
    if (!subjectId) return;
    setLoadingCurriculum(true);
    fetch(`/api/teacher/subjects/${subjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.curriculum) {
          const extractedTopics: Array<{ id: string; title: string; unit_id?: string }> = [];
          for (const unit of data.curriculum) {
            for (const t of unit.topics || []) {
              extractedTopics.push({ id: t.id, title: `${unit.title}: ${t.title}`, unit_id: unit.id });
            }
          }
          setTopics(extractedTopics);
          if (!topicId && extractedTopics.length > 0) {
            setTopicId(extractedTopics[0].id);
            setUnitId(extractedTopics[0].unit_id || "");
          }
        }
      })
      .catch((err) => console.error("Error fetching subject topics:", err))
      .finally(() => setLoadingCurriculum(false));
  }, [subjectId]);

  // Derived effective correct answer string
  const effectiveCorrectAnswer = React.useMemo(() => {
    if (questionType === "MULTIPLE_SELECT") {
      return selectedMultipleCorrect.join(",");
    }
    return correctAnswer;
  }, [questionType, selectedMultipleCorrect, correctAnswer]);

  // Live quality check calculation
  const qualityReport = React.useMemo(() => {
    return validateQuestionQuality(
      {
        question_text: questionText,
        subject_id: subjectId,
        topic_id: topicId,
        question_type: questionType,
        options: ["MCQ", "MULTIPLE_SELECT"].includes(questionType) ? options : [],
        correct_answer: effectiveCorrectAnswer,
        explanation,
        marks,
        difficulty,
        cognitive_level: cognitiveLevel,
      },
      existingQuestions.filter((q) => !initialQuestion || q.id !== initialQuestion.id)
    );
  }, [
    questionText,
    subjectId,
    topicId,
    questionType,
    options,
    effectiveCorrectAnswer,
    explanation,
    marks,
    difficulty,
    cognitiveLevel,
    existingQuestions,
    initialQuestion,
  ]);

  // Option helpers
  function updateOptionText(id: string, text: string) {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  }

  function setSingleCorrectOption(id: string) {
    setCorrectAnswer(id);
    setOptions(
      options.map((opt) => ({
        ...opt,
        is_correct: opt.id === id,
      }))
    );
  }

  function toggleMultipleCorrectOption(id: string) {
    const next = selectedMultipleCorrect.includes(id)
      ? selectedMultipleCorrect.filter((item) => item !== id)
      : [...selectedMultipleCorrect, id];
    setSelectedMultipleCorrect(next);
    setOptions(
      options.map((opt) => ({
        ...opt,
        is_correct: next.includes(opt.id),
      }))
    );
  }

  function addOption() {
    const nextId = `opt_${options.length + 1}`;
    setOptions([...options, { id: nextId, text: "", is_correct: false }]);
  }

  function removeOption(id: string) {
    if (options.length <= 2) return;
    const remaining = options.filter((opt) => opt.id !== id);
    setOptions(remaining);
    if (correctAnswer === id) {
      setCorrectAnswer(remaining[0]?.id || "");
    }
    if (selectedMultipleCorrect.includes(id)) {
      setSelectedMultipleCorrect(selectedMultipleCorrect.filter((x) => x !== id));
    }
  }

  const parsedTags = React.useMemo(() => {
    return tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tagsInput]);

  async function handleSave(targetMode: "DRAFT" | "REVIEW") {
    setSubmitError(null);
    setSuccessNotice(null);

    if (!subjectId) {
      setSubmitError("Please select a subject.");
      return;
    }
    if (!questionText.trim()) {
      setSubmitError("Question text is required.");
      return;
    }

    if (targetMode === "REVIEW") {
      if (qualityReport.status === "FAIL") {
        setSubmitError(
          `Cannot submit for review due to quality errors: ${qualityReport.errors.join("; ")}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const fullText =
        questionType === "SCENARIO" && scenarioContext.trim()
          ? `[Context: ${scenarioContext.trim()}]\n\n${questionText.trim()}`
          : questionText.trim();

      const payload = {
        subject_id: subjectId,
        unit_id: unitId || null,
        topic_id: topicId || null,
        subtopic: subtopic.trim() || null,
        question_type: questionType,
        question_text: fullText,
        options: ["MCQ", "MULTIPLE_SELECT"].includes(questionType) ? options : [],
        correct_answer: effectiveCorrectAnswer.trim() || null,
        explanation: explanation.trim() || null,
        difficulty,
        cognitive_level: cognitiveLevel,
        marks,
        estimated_time: estimatedTime,
        tags: parsedTags,
        is_draft: targetMode === "DRAFT",
        status: targetMode,
      };

      let res: Response;
      if (isEditing && initialQuestion?.id) {
        res = await fetch(`/api/teacher/questions/${initialQuestion.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            isDraftMode: targetMode === "DRAFT",
          }),
        });
      } else {
        res = await fetch("/api/teacher/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save question.");
      }

      setSuccessNotice(
        targetMode === "DRAFT" ? "Saved as DRAFT successfully." : "Submitted for Review successfully!"
      );

      const savedId = data.question?.id || initialQuestion?.id;
      if (savedId) {
        router.push(`/teacher/questions/${savedId}`);
      } else {
        router.push("/teacher/questions");
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to process question.");
    } finally {
      setSubmitting(false);
    }
  }

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
            <span className="text-slate-300 font-semibold">
              {isEditing ? `Edit Question #${initialQuestion?.id.slice(0, 8)}` : "New Question Draft"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isEditing ? "Edit Assessment Question" : "Create Question Item"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Author multi-tier assessment items with real-time quality verification and duplicate detection.
          </p>
        </div>

        {/* Live Quality Badge */}
        <div className="flex items-center gap-2">
          {qualityReport.status === "PASS" && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Quality: PASS</span>
            </div>
          )}
          {qualityReport.status === "WARNING" && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs text-amber-400 font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>Quality: WARNING</span>
            </div>
          )}
          {qualityReport.status === "FAIL" && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs text-red-400 font-medium">
              <XCircle className="h-4 w-4" />
              <span>Quality: FAIL</span>
            </div>
          )}
        </div>
      </div>

      {/* Quality Check Alerts */}
      {qualityReport.errors.length > 0 && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
            <XCircle className="h-4 w-4 text-red-400" />
            <span>Structural Issues Detected (Required to pass quality check)</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-red-300/80 pl-2 space-y-0.5">
            {qualityReport.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {qualityReport.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Quality Warnings / Duplicate Detection</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-amber-300/80 pl-2 space-y-0.5">
            {qualityReport.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-4 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {successNotice && (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Authoring Form */}
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Curriculum Association & Metadata</CardTitle>
            <CardDescription className="text-xs">
              Link this question to your authorized syllabus structure and taxonomy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subject *</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Topic</label>
                <select
                  value={topicId}
                  onChange={(e) => {
                    setTopicId(e.target.value);
                    const chosen = topics.find((t) => t.id === e.target.value);
                    if (chosen?.unit_id) setUnitId(chosen.unit_id);
                  }}
                  disabled={loadingCurriculum || topics.length === 0}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Select Topic (Optional for Draft) --</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subtopic</label>
                <input
                  type="text"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  placeholder="e.g., Binary Search Trees"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Question Type *</label>
                <select
                  value={questionType}
                  onChange={(e) => {
                    const newType = e.target.value as TeacherQuestionType;
                    setQuestionType(newType);
                    if (newType === "TRUE_FALSE") {
                      setCorrectAnswer("true");
                    } else if (newType === "MCQ") {
                      setCorrectAnswer("opt_1");
                    } else if (newType === "MULTIPLE_SELECT") {
                      setSelectedMultipleCorrect(["opt_1"]);
                    } else {
                      setCorrectAnswer("");
                    }
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="MULTIPLE_SELECT">Multiple Select (Multiple Correct)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                  <option value="SCENARIO">Scenario Analysis</option>
                  <option value="PROBLEM_SOLVING">Problem Solving</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Difficulty *</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Cognitive Level *</label>
                <select
                  value={cognitiveLevel}
                  onChange={(e) => setCognitiveLevel(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="REMEMBER">REMEMBER</option>
                  <option value="UNDERSTAND">UNDERSTAND</option>
                  <option value="APPLY">APPLY</option>
                  <option value="ANALYZE">ANALYZE</option>
                  <option value="EVALUATE">EVALUATE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Marks *</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Estimated Time (seconds)</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="algorithms, trees, exam-2"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedTags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Text & Type-Specific Content */}
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Question Content & Answer Key</CardTitle>
            <CardDescription className="text-xs">
              Define the problem statement, answer verification key, and explanation notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Scenario Context (if SCENARIO) */}
            {questionType === "SCENARIO" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-amber-300">Scenario / Context Background</label>
                <textarea
                  value={scenarioContext}
                  onChange={(e) => setScenarioContext(e.target.value)}
                  rows={3}
                  placeholder="Describe the realistic industry scenario or organizational challenge..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* Main Question Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {questionType === "PROBLEM_SOLVING"
                  ? "Problem Statement *"
                  : questionType === "SCENARIO"
                  ? "Scenario Question Prompt *"
                  : "Question Prompt / Text *"}
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                placeholder="State the prompt clearly, specifying prerequisites and expected evaluation context..."
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* MCQ Options Editor (Single Answer) */}
            {questionType === "MCQ" && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Multiple Choice Options (Select the single correct answer)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addOption}
                    className="text-xs text-indigo-400 hover:text-indigo-300 gap-1 h-7"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Option</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={correctAnswer === opt.id}
                        onChange={() => setSingleCorrectOption(opt.id)}
                        className="text-emerald-500 focus:ring-emerald-500"
                        title="Mark as correct answer"
                      />
                      <span className="text-xs font-mono text-slate-500 w-5">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOptionText(opt.id, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(opt.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MULTIPLE_SELECT Options Editor */}
            {questionType === "MULTIPLE_SELECT" && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Multiple Select Options (Check ALL correct answers)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addOption}
                    className="text-xs text-indigo-400 hover:text-indigo-300 gap-1 h-7"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Option</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMultipleCorrect.includes(opt.id)}
                        onChange={() => toggleMultipleCorrectOption(opt.id)}
                        className="rounded text-emerald-500 focus:ring-emerald-500"
                        title="Check to include in correct answers"
                      />
                      <span className="text-xs font-mono text-slate-500 w-5">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOptionText(opt.id, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(opt.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRUE_FALSE Options */}
            {questionType === "TRUE_FALSE" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">Correct Answer *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="tf_answer"
                      value="true"
                      checked={correctAnswer.toLowerCase() === "true"}
                      onChange={() => setCorrectAnswer("true")}
                    />
                    <span>True</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="tf_answer"
                      value="false"
                      checked={correctAnswer.toLowerCase() === "false"}
                      onChange={() => setCorrectAnswer("false")}
                    />
                    <span>False</span>
                  </label>
                </div>
              </div>
            )}

            {/* SHORT_ANSWER answer */}
            {questionType === "SHORT_ANSWER" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Expected Answer / Key Points *
                </label>
                <textarea
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  rows={3}
                  placeholder="Exact string or expected benchmark answer keywords..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* SCENARIO answer */}
            {questionType === "SCENARIO" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Expected Scenario Solution / Rubric *
                </label>
                <textarea
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  rows={3}
                  placeholder="Key decisions, architectural considerations, and criteria for evaluation..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* PROBLEM_SOLVING answer & key steps */}
            {questionType === "PROBLEM_SOLVING" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Expected Solution & Key Steps *
                </label>
                <textarea
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  rows={4}
                  placeholder="Step 1: Base condition...\nStep 2: Recurrence formulation...\nStep 3: Complexity derivation..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            )}

            {/* Explanation */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">
                Pedagogical Explanation / Rubric Notes
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                placeholder="Explain why the solution holds, common pitfalls, and grading rubric guidance..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <Link href="/teacher/questions">
            <Button variant="outline" size="sm" className="text-xs border-slate-700">
              Cancel
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave("DRAFT")}
              disabled={submitting}
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white text-xs font-medium gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save as Draft</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("REVIEW")}
              disabled={submitting || qualityReport.status === "FAIL"}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? "Submitting..." : "Submit for Review"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
