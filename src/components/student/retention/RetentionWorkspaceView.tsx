"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  Loader2,
  History,
  ShieldCheck,
} from "lucide-react";
import type { RetentionWorkspaceContext } from "@/lib/services/retention.service";
import type { RetentionStage } from "@/types/database.types";

interface RetentionWorkspaceViewProps {
  initialContext: RetentionWorkspaceContext;
}

const STAGE_LABELS: Record<RetentionStage, string> = {
  RETENTION_24H: "24-Hour Spaced Retrieval Check",
  RETENTION_7D: "7-Day Spaced Retrieval Check",
  RETENTION_30D: "30-Day Spaced Retrieval Check",
};

export function RetentionWorkspaceView({ initialContext }: RetentionWorkspaceViewProps) {
  const router = useRouter();
  const { check, subject, topic, isAvailable, questions } = initialContext;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Active elapsed timer
  useEffect(() => {
    if (!isAvailable || check.status === "COMPLETED") return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isAvailable, check.status]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOptionChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const answeredCount = Object.keys(answers).filter((k) => !!answers[k]?.trim()).length;
  const isAllAnswered = questions.length > 0 && answeredCount === questions.length;

  const handleSubmit = async () => {
    if (submitting) return; // Prevent duplicate click
    setSubmitting(true);
    setError(null);

    try {
      const submissions = questions.map((q) => ({
        questionId: q.id,
        studentAnswer: answers[q.id] || null,
        timeSpentSeconds: Math.round(secondsElapsed / (questions.length || 1)),
      }));

      const res = await fetch(`/api/student/retention/${check.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissions,
          actualMinutesSpent: Math.max(1, Math.round(secondsElapsed / 60)),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit retention verification");
      }

      router.push(`/student/retention/${check.id}/result`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during submission.");
      setSubmitting(false);
    }
  };

  // Availability Guard: Check is locked until scheduled date arrives
  if (!isAvailable) {
    const scheduledDate = new Date(check.scheduled_at);
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <Lock className="h-8 w-8 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs text-indigo-300 border-indigo-700/60">
            {STAGE_LABELS[check.retention_stage]}
          </Badge>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Retention Check Not Available Yet
          </h1>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Spaced retrieval requires time between learning and testing to evaluate durable memory pathways.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 max-w-sm mx-auto text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Topic:</span>
            <strong className="text-white">{topic.title}</strong>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Scheduled Date:</span>
            <strong className="text-white">{scheduledDate.toLocaleDateString()}</strong>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Scheduled Time:</span>
            <strong className="text-white">
              {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </strong>
          </div>
        </div>

        <div>
          <Link href="/student/retention">
            <Button variant="outline" size="sm" className="text-xs border-slate-700">
              Return to Retention Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Workspace Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              {subject.name} &bull; {topic.title}
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
              {STAGE_LABELS[check.retention_stage]}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span>{formatTimer(secondsElapsed)}</span>
            </div>
            <Badge variant="outline" className="text-xs border-amber-700/60 text-amber-300">
              Baseline: {check.baseline_score}%
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Active Retrieval Assessment ({questions.length} questions)</span>
          <span>
            {answeredCount} of {questions.length} answered
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Retrieval Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className="border-slate-800 bg-slate-900/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-800">
                  Question {idx + 1} of {questions.length} &bull; {q.questionType.replace(/_/g, " ")}
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
                    <RadioGroupItem value={opt} id={`ret_${q.id}_${optIdx}`} />
                    <Label
                      htmlFor={`ret_${q.id}_${optIdx}`}
                      className="text-xs cursor-pointer leading-normal flex-1"
                    >
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit Action */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          Evaluated server-side against baseline ({check.baseline_score}%).
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!isAllAnswered || submitting}
          size="sm"
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5 shadow-md disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Evaluating Retrieval...
            </>
          ) : (
            <>
              Submit Retention Check
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
