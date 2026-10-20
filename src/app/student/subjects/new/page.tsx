"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Clock, Target, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { PreparationLevel } from "@/types/database.types";

const PREPARATION_LEVELS: { id: PreparationLevel; label: string; desc: string }[] = [
  { id: "NOT_STARTED", label: "Not Started", desc: "Starting completely fresh with this subject" },
  { id: "BASIC", label: "Basic", desc: "Familiar with terminology and broad outlines" },
  { id: "SOME_PREPARATION", label: "Some Preparation", desc: "Covered foundational units and textbooks" },
  { id: "COMPLETED", label: "Completed", desc: "Finished studying all units once" },
  { id: "REVISED", label: "Revised", desc: "Undergone multiple rounds of review and practice" },
];

const TARGET_SCORE_PRESETS = ["PASS", "60", "70", "80", "90", "95"];

export default function NewSubjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState("80");
  const [customTarget, setCustomTarget] = useState("");
  const [isCustomTarget, setIsCustomTarget] = useState(false);
  const [dailyTimeMinutes, setDailyTimeMinutes] = useState(60);
  const [preparationLevel, setPreparationLevel] = useState<PreparationLevel>("NOT_STARTED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a subject name");
      return;
    }

    setLoading(true);
    setError(null);

    const effectiveTargetScore = isCustomTarget ? customTarget.trim() || "80" : targetScore;

    try {
      const res = await fetch("/api/student/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          examDate: examDate || undefined,
          targetScore: effectiveTargetScore,
          dailyTimeMinutes: Number(dailyTimeMinutes) || 60,
          preparationLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create subject");
      }

      router.push(`/student/subjects/${data.subject.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while creating the subject");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-3">
        <Link href="/student/subjects">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            Add New Subject
          </h1>
          <p className="text-xs text-slate-400">
            Define your curriculum foundation, targets, and study baseline.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Subject Foundation</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter subject specifics to calculate realistic capability gaps and target milestones.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md">
                {error}
              </div>
            )}

            {/* Subject Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-200">
                Subject Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Compiler Design, Data Structures & Algorithms, Operating Systems"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Optional Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-200">
                Description / Syllabus Notes (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Key focus areas, exam syllabus code, university course code..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-sm resize-none"
              />
            </div>

            {/* Exam Date & Daily Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="examDate" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  Exam Date (Target)
                </Label>
                <Input
                  id="examDate"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dailyTime" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  Available Study Time / Day
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="dailyTime"
                    type="number"
                    min={15}
                    max={720}
                    step={15}
                    value={dailyTimeMinutes}
                    onChange={(e) => setDailyTimeMinutes(Number(e.target.value))}
                    className="bg-slate-950/60 border-slate-800 text-sm"
                  />
                  <span className="text-xs text-slate-400 shrink-0">min/day</span>
                </div>
              </div>
            </div>

            {/* Target Score Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                Target Score / Benchmark
              </Label>
              <div className="flex flex-wrap gap-2">
                {TARGET_SCORE_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={!isCustomTarget && targetScore === preset ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => {
                      setIsCustomTarget(false);
                      setTargetScore(preset);
                    }}
                  >
                    {preset === "PASS" ? "PASS (50%)" : `${preset}%`}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={isCustomTarget ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => setIsCustomTarget(true)}
                >
                  Custom
                </Button>
              </div>

              {isCustomTarget && (
                <div className="pt-2">
                  <Input
                    placeholder="Enter custom target score or grade (e.g. 85, Grade A, 4.0)"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 text-sm max-w-xs"
                  />
                </div>
              )}
            </div>

            {/* Preparation Level */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Current Preparation Level
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PREPARATION_LEVELS.map((level) => {
                  const isSelected = preparationLevel === level.id;
                  return (
                    <div
                      key={level.id}
                      onClick={() => setPreparationLevel(level.id)}
                      className={`cursor-pointer p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500 shadow-sm"
                          : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? "text-indigo-300" : "text-slate-200"}`}>
                          {level.label}
                        </span>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{level.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-slate-800/80 pt-4">
            <Link href="/student/subjects">
              <Button type="button" variant="ghost" size="sm" className="text-xs">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5 font-medium"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save & Configure Curriculum
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
