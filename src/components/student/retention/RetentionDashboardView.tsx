"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  History,
} from "lucide-react";
import type { RetentionDashboardData } from "@/lib/services/retention.service";
import type { RetentionStage } from "@/types/database.types";

interface RetentionDashboardViewProps {
  data: RetentionDashboardData;
}

const STAGE_LABELS: Record<RetentionStage, string> = {
  RETENTION_24H: "24-Hour Check",
  RETENTION_7D: "7-Day Check",
  RETENTION_30D: "30-Day Check",
};

export function RetentionDashboardView({ data }: RetentionDashboardViewProps) {
  const { dueChecks, upcomingChecks, completedChecks, timelines, counts } = data;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="rounded-2xl border border-indigo-800/40 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-indigo-400" />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Spaced Retention Engine
              </h1>
              <Badge variant="outline" className="border-indigo-600/50 text-indigo-300 text-xs">
                Active Retrieval
              </Badge>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Verifying whether demonstrated capabilities persist across 24-hour, 7-day, and 30-day retrieval intervals. If performance declines, targeted revision is automatically scheduled.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/student/plan">
              <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300">
                View Learning Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* Aggregate Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 p-3 text-center">
            <span className="text-[11px] font-medium text-amber-300">Due Now</span>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">{counts.dueCount}</div>
          </div>
          <div className="rounded-xl border border-indigo-800/30 bg-indigo-950/20 p-3 text-center">
            <span className="text-[11px] font-medium text-indigo-300">Upcoming</span>
            <div className="text-2xl font-bold text-indigo-400 mt-0.5">{counts.upcomingCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/20 p-3 text-center">
            <span className="text-[11px] font-medium text-emerald-300">Retained</span>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">{counts.retainedCount}</div>
          </div>
          <div className="rounded-xl border border-rose-800/30 bg-rose-950/20 p-3 text-center">
            <span className="text-[11px] font-medium text-rose-300">Declining</span>
            <div className="text-2xl font-bold text-rose-400 mt-0.5">{counts.decliningCount}</div>
          </div>
          <div className="rounded-xl border border-red-800/30 bg-red-950/20 p-3 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-red-300">Needs Review</span>
            <div className="text-2xl font-bold text-red-400 mt-0.5">{counts.needsReviewCount}</div>
          </div>
        </div>
      </div>

      {/* Section 1: Checks Due Today */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Due Now</h2>
            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-300 border-amber-600/30">
              {dueChecks.length} available
            </Badge>
          </div>
        </div>

        {dueChecks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-semibold text-white">All retention checks up to date</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              You have no active retrieval checks due at this time. Future checks will become available as their scheduled intervals arrive.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dueChecks.map((check) => (
              <Card
                key={check.id}
                className="border-amber-700/40 bg-gradient-to-b from-amber-950/20 to-slate-900 shadow-md hover:border-amber-600/60 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-700/60">
                      {STAGE_LABELS[check.retention_stage]}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{check.subjectName}</span>
                  </div>
                  <CardTitle className="text-sm font-bold text-white pt-2 leading-snug">
                    {check.topicTitle}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300 mt-1">
                    Post-Learning Baseline: <strong className="text-white">{check.baseline_score}%</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <Link href={`/student/retention/${check.id}`}>
                    <Button size="sm" className="w-full text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold gap-1 shadow-sm">
                      Take Check Now
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Topic Retention Timelines */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Topic Retention Timelines</h2>
        </div>

        {timelines.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-400">
            No retention timelines recorded yet. Complete a learning plan action with post-verification to begin spaced tracking.
          </div>
        ) : (
          <div className="space-y-3">
            {timelines.map((timeline) => (
              <div
                key={timeline.topicId}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{timeline.topicTitle}</h3>
                    <span className="text-[11px] text-slate-400">{timeline.subjectName} &bull; Post-Learning Baseline: {timeline.baselineScore}%</span>
                  </div>
                  <div>
                    <Badge
                      variant={
                        timeline.latestStatus === "RETAINED"
                          ? "default"
                          : timeline.latestStatus === "DECLINING" || timeline.latestStatus === "NEEDS_REVIEW"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[11px]"
                    >
                      {timeline.latestStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                {/* Spaced Intervals Pipeline */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  {(["RETENTION_24H", "RETENTION_7D", "RETENTION_30D"] as RetentionStage[]).map((stage) => {
                    const check = timeline.checks[stage];
                    const isCompleted = check?.status === "COMPLETED";
                    const isDue = check && new Date().getTime() >= new Date(check.scheduled_at).getTime() && !isCompleted;

                    return (
                      <div
                        key={stage}
                        className={`rounded-lg border p-2.5 text-xs transition-colors ${
                          isCompleted
                            ? check.retention_status === "RETAINED"
                              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                              : check.retention_status === "DECLINING" || check.retention_status === "NEEDS_REVIEW"
                              ? "bg-rose-950/20 border-rose-800/40 text-rose-300"
                              : "bg-indigo-950/20 border-indigo-800/40 text-indigo-300"
                            : isDue
                            ? "bg-amber-950/30 border-amber-700/60 text-amber-300"
                            : "bg-slate-950/40 border-slate-800/60 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {stage === "RETENTION_24H" ? "24 Hours" : stage === "RETENTION_7D" ? "7 Days" : "30 Days"}
                        </div>
                        <div className="font-bold text-sm mt-1">
                          {isCompleted ? (
                            `${check.score}%`
                          ) : isDue ? (
                            <Link href={`/student/retention/${check.id}`} className="text-amber-400 underline font-semibold">
                              Due Now
                            </Link>
                          ) : (
                            <span className="text-slate-500 font-normal">Pending</span>
                          )}
                        </div>
                        {isCompleted && check.performance_delta !== null && (
                          <div className={`text-[10px] mt-0.5 ${check.performance_delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {check.performance_delta >= 0 ? `+${check.performance_delta}` : check.performance_delta}% pts
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Upcoming Checks */}
      {upcomingChecks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Upcoming Scheduled Checks</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingChecks.map((check) => (
              <div
                key={check.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs space-y-2 opacity-80"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <Badge variant="outline" className="text-[10px] border-slate-700">
                    {STAGE_LABELS[check.retention_stage]}
                  </Badge>
                  <span>Scheduled</span>
                </div>
                <div className="font-semibold text-white text-sm">{check.topicTitle}</div>
                <div className="text-slate-400 text-[11px]">
                  Unlocks: {new Date(check.scheduled_at).toLocaleDateString()} at{" "}
                  {new Date(check.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
