"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, ArrowRight, TrendingUp, Loader2 } from "lucide-react";
import type { ClientSafeQuestion } from "@/lib/intelligence/action-content";

interface PostLearningVerificationProps {
  itemId: string;
  topicTitle: string;
  questions: ClientSafeQuestion[];
  preScore: number;
  actualMinutesSpent: number;
}

export function PostLearningVerification({
  itemId,
  topicTitle,
  questions,
  preScore,
  actualMinutesSpent,
}: PostLearningVerificationProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptionChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const isAllAnswered = questions.length > 0 && questions.every((q) => !!answers[q.id]?.trim());

  const handleSubmit = async () => {
    if (!isAllAnswered) {
      setError("Please answer all post-verification questions to calculate learning gain.");
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
          actionType: "SUBMIT_POST_VERIFICATION",
          submissions,
          actualMinutesSpent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Post-verification submission failed");

      // Redirect to the learning gain result view
      router.push(`/student/learn/${itemId}/result`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white">Post-Learning Verification</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Answer these final {questions.length} questions to measure whether your capability in{" "}
              <strong className="text-white">{topicTitle}</strong> improved compared to your baseline ({preScore}%).
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

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className="border-slate-800 bg-slate-900/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800">
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
                          ? "bg-emerald-950/40 border-emerald-600/80 text-white"
                          : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <RadioGroupItem value={opt} id={`post_${q.id}_${optIdx}`} />
                      <Label
                        htmlFor={`post_${q.id}_${optIdx}`}
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
            className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold gap-1.5 px-6"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Calculating Learning Gain...
              </>
            ) : (
              <>
                Submit & Calculate Gain
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
