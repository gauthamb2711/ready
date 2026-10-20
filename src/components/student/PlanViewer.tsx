"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Target,
  ArrowRight,
  Play,
  Pause,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  Sparkles,
  Layers,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Award,
} from "lucide-react";
import type {
  LearningPlan,
  LearningPlanDay,
  LearningPlanItem,
  LearningActionStatus,
  PlanMode,
} from "@/types/database.types";

interface PlanViewerProps {
  initialPlan: LearningPlan;
  initialDays: Array<LearningPlanDay & { items: LearningPlanItem[] }>;
  subjectName: string;
  subjectId: string;
}

const MODE_BADGES: Record<PlanMode, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; desc: string }> = {
  RESCUE: { label: "Rescue Mode", variant: "destructive", desc: "Target date is near with significant gaps." },
  FOUNDATION: { label: "Foundation Mode", variant: "secondary", desc: "Core fundamental principles and terminology." },
  CATCH_UP: { label: "Catch-Up Mode", variant: "default", desc: "Accelerated schedule focusing on high-weightage topics." },
  OPTIMIZATION: { label: "Optimization Mode", variant: "outline", desc: "High baseline; polishing edge cases and speed." },
  EARLY_PREP: { label: "Early Prep Mode", variant: "outline", desc: "Extended runway; spaced reinforcement." },
  NORMAL_PREP: { label: "Normal Prep", variant: "default", desc: "Systematic, balanced gap closure." },
};

const ACTION_TYPE_ICONS: Record<string, string> = {
  UNDERSTAND: "🧠",
  EXPLAIN: "📝",
  EXAMPLE: "🔍",
  GUIDED_PRACTICE: "🛠️",
  INDEPENDENT_PRACTICE: "⚡",
  RECALL: "🎯",
  APPLICATION: "🚀",
  REVIEW: "🔄",
};

export function PlanViewer({
  initialPlan,
  initialDays,
  subjectName,
  subjectId,
}: PlanViewerProps) {
  const [plan, setPlan] = useState<LearningPlan>(initialPlan);
  const [days, setDays] = useState(initialDays);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [regenerating, setRegenerating] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDay = days.find((d) => d.day_number === selectedDayNumber) || days[0];

  // Calculate day-level progress
  const completedDayMinutes =
    activeDay?.items
      .filter((i) => i.status === "COMPLETED")
      .reduce((acc, i) => acc + i.estimated_minutes, 0) || 0;

  const totalDayMinutes = activeDay?.total_allocated_minutes || 1;
  const dayProgressPercent = Math.min(100, Math.round((completedDayMinutes / totalDayMinutes) * 100));

  // Action state handler
  const handleUpdateStatus = async (item: LearningPlanItem, nextStatus: LearningActionStatus) => {
    setUpdatingItemId(item.id);
    setError(null);

    try {
      const res = await fetch("/api/student/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          status: nextStatus,
          actualMinutesSpent: nextStatus === "COMPLETED" ? item.estimated_minutes : item.actual_minutes_spent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update action");

      // Optimistically update local state
      setDays((prevDays) =>
        prevDays.map((d) => {
          if (d.id === item.plan_day_id) {
            return {
              ...d,
              items: d.items.map((i) => (i.id === item.id ? data.item : i)),
            };
          }
          return d;
        })
      );
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Regeneration handler
  const handleRegenerate = async () => {
    const confirmRegen = window.confirm(
      "Regenerate your personalized learning plan? A new version (v" +
        (plan.version + 1) +
        ") will be created incorporating the latest diagnostic capability states."
    );
    if (!confirmRegen) return;

    setRegenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/student/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          forceRegenerate: true,
          regenerationReason: "Student requested recalculation with updated capability states",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Plan regeneration failed");

      setPlan(data.plan);
      setDays(data.days);
      setSelectedDayNumber(1);
    } catch (err: any) {
      setError(err.message || "Failed to regenerate plan");
    } finally {
      setRegenerating(false);
    }
  };

  const modeBadge = MODE_BADGES[plan.mode] || MODE_BADGES.NORMAL_PREP;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md">
          {error}
        </div>
      )}

      {/* Plan Header & Mode Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{plan.title}</h1>
              <Badge variant={modeBadge.variant} className="text-xs">
                {modeBadge.label}
              </Badge>
              <Badge variant="outline" className="text-xs border-indigo-700/60 text-indigo-300">
                Plan v{plan.version} (Active)
              </Badge>
            </div>

            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              <span className="font-semibold text-indigo-300">Reasoning: </span>
              {plan.mode_reason}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Daily Commitment: {plan.daily_study_minutes} min/day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <span>Runway: {plan.days_remaining} Days Remaining</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                <span>Capability Gap: {plan.capability_gap}% points</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            <Button
              onClick={handleRegenerate}
              disabled={regenerating}
              size="sm"
              variant="outline"
              className="border-indigo-700/50 hover:bg-indigo-950/40 text-xs gap-1.5"
            >
              {regenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
              )}
              Regenerate Plan (v{plan.version + 1})
            </Button>
            <span className="text-[10px] text-slate-500">
              Preserves version history
            </span>
          </div>
        </div>
      </div>

      {/* Day Selector Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {days.map((day) => {
          const isSelected = day.day_number === selectedDayNumber;
          const completedCount = day.items.filter((i) => i.status === "COMPLETED").length;
          const allCompleted = day.items.length > 0 && completedCount === day.items.length;

          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayNumber(day.day_number)}
              className={`px-3.5 py-2.5 rounded-lg border text-left shrink-0 transition-all select-none ${
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold">
                  Day {day.day_number}
                </span>
                {allCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Week {day.week_number} &bull; {day.total_allocated_minutes} min
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day View */}
      {activeDay && (
        <Card className="border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Day {activeDay.day_number} of {days.length}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                    Scheduled: {new Date(activeDay.scheduled_date).toLocaleDateString()}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-white mt-1">
                  {activeDay.theme || "Personalized Learning Focus"}
                </CardTitle>
              </div>

              {/* Day Progress Meter */}
              <div className="sm:text-right space-y-1">
                <div className="text-xs font-semibold text-slate-300">
                  {completedDayMinutes} / {activeDay.total_allocated_minutes} mins ({dayProgressPercent}%)
                </div>
                <div className="w-36 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${dayProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {activeDay.items.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                No learning actions scheduled for this day.
              </p>
            ) : (
              <div className="space-y-3">
                {activeDay.items.map((item, idx) => {
                  const isUpdating = updatingItemId === item.id;
                  const isCompleted = item.status === "COMPLETED";
                  const isInProgress = item.status === "IN_PROGRESS";
                  const isSkipped = item.status === "SKIPPED";

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCompleted
                          ? "bg-emerald-950/20 border-emerald-800/30 opacity-80"
                          : isInProgress
                          ? "bg-indigo-950/30 border-indigo-700/60 shadow-md"
                          : isSkipped
                          ? "bg-slate-950/30 border-slate-800/40 opacity-50"
                          : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        {/* Action Details */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base">
                              {ACTION_TYPE_ICONS[item.action_type] || "📚"}
                            </span>
                            <h4
                              className={`text-sm font-semibold ${
                                isCompleted ? "line-through text-slate-400" : "text-white"
                              }`}
                            >
                              {idx + 1}. {item.title}
                            </h4>
                            <Badge
                              variant={
                                item.priority === "CRITICAL"
                                  ? "destructive"
                                  : item.priority === "HIGH"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {item.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                              {item.estimated_minutes} min
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-900/60">
                              {item.capability_state.replace(/_/g, " ")}
                            </Badge>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          {/* Reason for recommendation */}
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-md border border-slate-800/60 mt-2">
                            <HelpCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <span>
                              <strong className="text-slate-300">Why recommended: </strong>
                              {item.reason}
                            </span>
                          </div>
                        </div>

                        {/* Action Status Controls */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                          ) : (
                            <>
                              {!isCompleted ? (
                                <>
                                  <Link href={`/student/learn/${item.id}`}>
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1 shadow-sm"
                                    >
                                      <Play className="h-3 w-3 fill-current" />
                                      {isInProgress ? "Resume Workspace" : "Start Learning"}
                                    </Button>
                                  </Link>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleUpdateStatus(item, "COMPLETED")
                                    }
                                    className="h-7 text-xs gap-1 border-slate-700 text-slate-300 hover:border-emerald-700 hover:text-emerald-400"
                                    title="Quick mark as done without verification"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Done
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateStatus(item, isSkipped ? "NOT_STARTED" : "SKIPPED")}
                                    className="h-7 text-[11px] text-slate-500 hover:text-slate-300 px-2"
                                    title="Skip this item"
                                  >
                                    <SkipForward className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Link href={`/student/learn/${item.id}/result`}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/40 gap-1"
                                    >
                                      <Award className="h-3 w-3" />
                                      View Gain
                                    </Button>
                                  </Link>

                                  <Link href={`/student/learn/${item.id}`}>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-[11px] text-slate-400 hover:text-slate-200"
                                      title="Review workspace content"
                                    >
                                      Review
                                    </Button>
                                  </Link>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
