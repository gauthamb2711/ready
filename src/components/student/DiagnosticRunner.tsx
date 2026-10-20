"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  BookOpen
} from "lucide-react";
import {
  DiagnosticAssessment,
  DiagnosticResponse
} from "@/types/database.types";
import type { ClientSafeDiagnosticQuestion } from "@/lib/services/diagnostic.service";

interface DiagnosticRunnerProps {
  initialAssessment: DiagnosticAssessment;
  initialQuestions: ClientSafeDiagnosticQuestion[];
  initialResponses?: DiagnosticResponse[];
}

export function DiagnosticRunner({
  initialAssessment,
  initialQuestions,
  initialResponses = [],
}: DiagnosticRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Response map: questionId -> answer string
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialResponses) {
      initialResponses.forEach((r) => {
        if (r.student_answer) {
          map[r.question_id] = r.student_answer;
        }
      });
    }
    return map;
  });

  const [submitting, setSubmitting] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = initialQuestions[currentIndex];
  const totalQuestions = initialQuestions.length;

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || "" : "";

  const handleSelectOption = async (option: string) => {
    if (!currentQuestion || submitting) return;
    const qId = currentQuestion.id;
    setAnswers((prev) => ({ ...prev, [qId]: option }));

    // Persist response asynchronously in background
    try {
      setSavingAnswer(true);
      await fetch(`/api/student/diagnostic/${initialAssessment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_response",
          questionId: qId,
          studentAnswer: option,
          timeSpentSeconds: 15,
        }),
      });
    } catch (err) {
      console.error("Auto-save response failed", err);
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleTextAnswerChange = (val: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleTextAnswerBlur = async () => {
    if (!currentQuestion || submitting) return;
    const qId = currentQuestion.id;
    const ans = answers[qId] || "";

    try {
      setSavingAnswer(true);
      await fetch(`/api/student/diagnostic/${initialAssessment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_response",
          questionId: qId,
          studentAnswer: ans,
          timeSpentSeconds: 20,
        }),
      });
    } catch (err) {
      console.error("Auto-save response failed", err);
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (submitting) return;

    // Check unanswered questions count
    const answeredCount = Object.keys(answers).filter((k) => !!answers[k]?.trim()).length;
    if (answeredCount < totalQuestions) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to finish and evaluate?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formattedResponses = Object.entries(answers).map(([questionId, studentAnswer]) => ({
        questionId,
        studentAnswer,
      }));

      const res = await fetch(`/api/student/diagnostic/${initialAssessment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          responses: formattedResponses,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      router.push(`/student/diagnostic/${initialAssessment.id}/results`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to submit assessment");
      setSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return (
      <Card className="border-slate-800 bg-slate-900/40 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-white">No questions available</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          This subject does not have any questions mapped in the question bank yet.
        </p>
        <Button
          onClick={() => router.push("/student/subjects")}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Return to Subjects
        </Button>
      </Card>
    );
  }

  const answeredCount = Object.keys(answers).filter((k) => !!answers[k]?.trim()).length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  // Normalize options array to string[]
  const rawOptions = currentQuestion.options || [];
  const normalizedOptions: string[] = Array.isArray(rawOptions)
    ? rawOptions.map((opt: any) => (typeof opt === "string" ? opt : opt.text || String(opt)))
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-2">
      {/* Top Bar with Subject & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Diagnostic Session
            </span>
            <Badge variant="outline" className="text-[10px] border-slate-700">
              Deterministic Evaluation
            </Badge>
          </div>
          <h2 className="text-sm font-bold text-white mt-0.5">
            Question {currentIndex + 1} of {totalQuestions}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-300 font-semibold">{answeredCount} Answered</span>
            <span className="text-[10px] text-slate-500 block">{totalQuestions - answeredCount} Remaining</span>
          </div>

          <Button
            size="sm"
            onClick={handleSubmitAssessment}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5 shadow-md"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Finish & Score
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md">
          {error}
        </div>
      )}

      {/* Question Card */}
      <Card className="border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-xl min-h-[380px] flex flex-col justify-between">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  currentQuestion.difficulty === "HARD"
                    ? "destructive"
                    : currentQuestion.difficulty === "MEDIUM"
                    ? "default"
                    : "secondary"
                }
                className="text-[10px] uppercase font-bold"
              >
                {currentQuestion.difficulty}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                {currentQuestion.type.replace(/_/g, " ")}
              </Badge>
              {currentQuestion.marks && (
                <span className="text-[11px] text-slate-500">{currentQuestion.marks} Mark(s)</span>
              )}
            </div>

            {savingAnswer && (
              <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
              </span>
            )}
          </div>

          <CardTitle className="text-base text-white font-medium leading-relaxed">
            {currentQuestion.prompt}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 py-2">
          {/* MCQ Option Rendering */}
          {currentQuestion.type === "MCQ" && normalizedOptions.length > 0 && (
            <div className="space-y-2.5">
              {normalizedOptions.map((option: string, optIdx: number) => {
                const isSelected = currentAnswer === option;
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(option)}
                    className={`cursor-pointer p-3.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white font-medium shadow-sm"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-500 text-white"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span>{option}</span>
                    </div>

                    {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Short Answer Text Input */}
          {currentQuestion.type === "SHORT_ANSWER" && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400 block">
                Type your concise answer below:
              </span>
              <Textarea
                placeholder="Enter formula, keyword, or concise explanation..."
                value={currentAnswer}
                onChange={(e) => handleTextAnswerChange(e.target.value)}
                onBlur={handleTextAnswerBlur}
                className="bg-slate-950/70 border-slate-800 text-xs min-h-[100px] focus:border-indigo-500"
              />
            </div>
          )}
        </CardContent>

        {/* Footer Navigation */}
        <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="text-xs gap-1 border-slate-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>

          <div className="flex items-center gap-1.5">
            {initialQuestions.map((q, idx) => {
              const isAnswered = !!answers[q.id]?.trim();
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent
                      ? "w-6 bg-indigo-500"
                      : isAnswered
                      ? "w-2 bg-emerald-500/80"
                      : "w-2 bg-slate-800 hover:bg-slate-700"
                  }`}
                  title={`Question ${idx + 1}`}
                />
              );
            })}
          </div>

          <Button
            variant={currentIndex === totalQuestions - 1 ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (currentIndex < totalQuestions - 1) {
                setCurrentIndex((prev) => prev + 1);
              } else {
                handleSubmitAssessment();
              }
            }}
            className={`text-xs gap-1 ${
              currentIndex === totalQuestions - 1
                ? "bg-indigo-600 hover:bg-indigo-500"
                : "border-slate-800"
            }`}
          >
            {currentIndex === totalQuestions - 1 ? (
              <>
                Submit
                <Send className="h-3 w-3" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
