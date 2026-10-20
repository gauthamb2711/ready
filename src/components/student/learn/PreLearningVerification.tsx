"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import type { ClientSafeQuestion } from "@/lib/intelligence/action-content";

interface PreLearningVerificationProps {
  itemId: string;
  topicTitle: string;
  questions: ClientSafeQuestion[];
  onComplete: (score: number) => void;
}

export function PreLearningVerification({
  itemId,
  topicTitle,
  questions,
  onComplete,
}: PreLearningVerificationProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ scorePercentage: number; correctCount: number; total: number } | null>(null);

  const handleOptionChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const isAllAnswered = questions.length > 0 && questions.every((q) => !!answers[q.id]?.trim());

  const handleSubmit = async () => {
    if (!isAllAnswered) {
      setError("Please answer all baseline questions before proceeding.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submissions = questions.map((q) => ({
        questionId: q.id,
        studentAnswer: answers[q.id]?.trim() || "",
      }));

      const res = await fetch(`/api/student/learn/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "SUBMIT_PRE_VERIFICATION",
          submissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pre-verification submission failed");

      setResult({
        scorePercentage: data.assessment.score_percentage,
        correctCount: data.assessment.correct_count,
        total: data.assessment.total_questions,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white">Pre-Learning Verification</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Before studying this action, answer these {questions.length} quick questions to establish your baseline capability for{" "}
              <strong className="text-white">{topicTitle}</strong>.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result ? (
        <Card className="border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Baseline Capability Established</h3>
            <p className="text-xs text-slate-400 mt-1">
              You scored <span className="font-semibold text-indigo-300">{result.scorePercentage}%</span> ({result.correctCount}/{result.total} correct).
            </p>
          </div>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Now proceed through the learning activity. At the end, a post-learning check will measure your verified capability gain!
          </p>
          <Button
            onClick={() => onComplete(result.scorePercentage)}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5"
          >
            Enter Learning Workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id} className="border-slate-800 bg-slate-900/60 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-800">
                    Question {idx + 1} of {questions.length}
                  </Badge>
                  {q.difficulty && (
                    <Badge variant="secondary" className="text-[10px]">
                      {q.difficulty}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-medium text-white pt-2 leading-relaxed">
                  {q.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                {q.options && q.options.length > 0 ? (
                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) => handleOptionChange(q.id, val)}
                    className="space-y-2"
                  >
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        onClick={() => handleOptionChange(q.id, opt)}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          answers[q.id] === opt
                            ? "bg-indigo-950/40 border-indigo-600/80 text-white"
                            : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <RadioGroupItem value={opt} id={`${q.id}_${optIdx}`} />
                        <Label
                          htmlFor={`${q.id}_${optIdx}`}
                          className="text-xs cursor-pointer leading-normal flex-1"
                        >
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Type your answer..."
                      value={answers[q.id] || ""}
                      onChange={(e) => handleOptionChange(q.id, e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !isAllAnswered}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5 px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Evaluating Baseline...
                </>
              ) : (
                <>
                  Submit Baseline Verification
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
