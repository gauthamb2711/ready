"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Target,
  Sparkles,
  Zap,
  Loader2,
  BookOpen,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { StudentSubject, ExamTiming, PreparationLevel, ConfidenceLevel } from "@/types/database.types";

interface DiagnosticIntakeFormProps {
  subjects: StudentSubject[];
  preselectedSubjectId?: string;
}

const EXAM_TIMING_OPTIONS: { id: ExamTiming; label: string; desc: string }[] = [
  { id: "TOMORROW", label: "Tomorrow", desc: "Urgent: triage high-yield items" },
  { id: "WITHIN_3_DAYS", label: "Within 3 Days", desc: "Short turnaround sprint" },
  { id: "WITHIN_1_WEEK", label: "Within 1 Week", desc: "Targeted gap remediation" },
  { id: "WITHIN_2_WEEKS", label: "Within 2 Weeks", desc: "Standard revision cycle" },
  { id: "WITHIN_1_MONTH", label: "Within 1 Month", desc: "Structured unit-by-unit review" },
  { id: "MORE_THAN_1_MONTH", label: "> 1 Month", desc: "Comprehensive foundational mastery" },
];

const CONFIDENCE_LEVELS: { id: ConfidenceLevel; label: string; desc: string }[] = [
  { id: "VERY_LOW", label: "Very Low", desc: "Uncertain across nearly all units" },
  { id: "LOW", label: "Low", desc: "Only comfortable with a few surface topics" },
  { id: "MEDIUM", label: "Medium", desc: "Moderate understanding; unverified under testing" },
  { id: "HIGH", label: "High", desc: "Comfortable with most problems and theory" },
  { id: "VERY_HIGH", label: "Very High", desc: "Extremely confident in full syllabus mastery" },
];

const PREPARATION_LEVELS: { id: PreparationLevel; label: string }[] = [
  { id: "NOT_STARTED", label: "Not Started" },
  { id: "BASIC", label: "Basic" },
  { id: "SOME_PREPARATION", label: "Some Preparation" },
  { id: "COMPLETED", label: "Completed" },
  { id: "REVISED", label: "Revised" },
];

export function DiagnosticIntakeForm({ subjects, preselectedSubjectId }: DiagnosticIntakeFormProps) {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState(
    preselectedSubjectId || (subjects.length > 0 ? subjects[0].id : "")
  );

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const [examTiming, setExamTiming] = useState<ExamTiming>("WITHIN_2_WEEKS");
  const [targetScore, setTargetScore] = useState(selectedSubject?.target_score || "80");
  const [currentPreparation, setCurrentPreparation] = useState<PreparationLevel>(
    selectedSubject?.current_prep_level || "SOME_PREPARATION"
  );
  const [availableDailyStudyTime, setAvailableDailyStudyTime] = useState(
    Number(selectedSubject?.available_daily_study_time) || 60
  );
  const [confidence, setConfidence] = useState<ConfidenceLevel>("MEDIUM");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (subjects.length === 0) {
    return (
      <Card className="border-slate-800 bg-slate-900/50 p-6 text-center">
        <BookOpen className="h-8 w-8 text-indigo-400 mx-auto mb-2 opacity-80" />
        <h3 className="text-base font-semibold text-white">No subjects registered yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          You need at least one active subject with a curriculum structure before initiating an assessment.
        </p>
        <Link href="/student/subjects/new">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs">
            Create First Subject
          </Button>
        </Link>
      </Card>
    );
  }

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError("Please select a subject");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/student/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          examTiming,
          targetScore,
          currentPreparation,
          availableDailyStudyTime: Number(availableDailyStudyTime) || 60,
          confidence,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize diagnostic session");
      }

      router.push(`/student/diagnostic/${data.assessment.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to initialize assessment");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleStart} className="space-y-6">
      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md">
          {error}
        </div>
      )}

      {/* Subject Selection */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            1. Target Subject
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Choose which course syllabus you wish to benchmark against.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={subjectId}
            onChange={(e) => {
              const newId = e.target.value;
              setSubjectId(newId);
              const found = subjects.find((s) => s.id === newId);
              if (found) {
                setTargetScore(found.target_score);
                setCurrentPreparation(found.current_prep_level);
                setAvailableDailyStudyTime(Number(found.available_daily_study_time) || 60);
              }
            }}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} (Current: {(sub.current_capability_score ?? 0).toFixed(0)}% | Target: {sub.target_score}%)
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Intake Context Grid */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            2. Exam Timing
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            How soon is your evaluation or exam deadline?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {EXAM_TIMING_OPTIONS.map((opt) => {
              const isSelected = examTiming === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setExamTiming(opt.id)}
                  className={`cursor-pointer p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500 shadow-sm"
                      : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <span className={`text-xs font-semibold block ${isSelected ? "text-indigo-300" : "text-slate-200"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{opt.desc}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confidence Level */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              3. Self-Reported Confidence
            </CardTitle>
            <div className="flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <HelpCircle className="h-3 w-3" />
              <span>Not treated as verified mastery</span>
            </div>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Helps detect false confidence or forgotten knowledge without influencing verified scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {CONFIDENCE_LEVELS.map((conf) => {
              const isSelected = confidence === conf.id;
              return (
                <div
                  key={conf.id}
                  onClick={() => setConfidence(conf.id)}
                  className={`cursor-pointer p-2.5 rounded-lg border text-center transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold"
                      : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs block">{conf.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Target & Study Parameters */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-400" />
            4. Targets & Current Preparation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Target Score</Label>
            <Input
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-xs"
              placeholder="e.g. 80, PASS, 90"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Study Time / Day</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={availableDailyStudyTime}
                onChange={(e) => setAvailableDailyStudyTime(Number(e.target.value))}
                className="bg-slate-950/80 border-slate-800 text-xs"
              />
              <span className="text-xs text-slate-400">mins</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Current Prep</Label>
            <select
              value={currentPreparation}
              onChange={(e) => setCurrentPreparation(e.target.value as PreparationLevel)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-xs text-white"
            >
              {PREPARATION_LEVELS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>

        <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Assessment questions will be deterministic and server-evaluated.
          </span>
          <Button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Begin Assessment
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
