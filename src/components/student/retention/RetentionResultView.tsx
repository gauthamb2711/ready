"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Layers,
  AlertTriangle,
} from "lucide-react";
import type { RetentionResultData } from "@/lib/services/retention.service";
import type { RetentionStage } from "@/types/database.types";

interface RetentionResultViewProps {
  data: RetentionResultData;
}

const STAGE_LABELS: Record<RetentionStage, string> = {
  RETENTION_24H: "24-Hour Retention Check",
  RETENTION_7D: "7-Day Retention Check",
  RETENTION_30D: "30-Day Retention Check",
};

export function RetentionResultView({ data }: RetentionResultViewProps) {
  const { check, topic, subject, classification, revisionItem } = data;
  const delta = classification.deltaPoints;
  const isPositive = delta >= 0;
  const deltaSign = isPositive ? "+" : "";

  const statusBadgeColor =
    classification.status === "RETAINED"
      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800"
      : classification.status === "STABLE"
      ? "text-indigo-400 bg-indigo-950/40 border-indigo-800"
      : classification.status === "DECLINING"
      ? "text-rose-400 bg-rose-950/40 border-rose-800"
      : "text-red-400 bg-red-950/40 border-red-800";

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-3 backdrop-blur-sm shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-700/60">
          <History className="h-7 w-7" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            {STAGE_LABELS[check.retention_stage]}
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Retention Check Complete
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {subject.name} &bull; <strong className="text-slate-200">{topic.title}</strong>
          </p>
        </div>
      </div>

      {/* Baseline vs Retention Metric Comparison */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center">
          <span className="text-[11px] font-medium text-slate-400">Post-Learning Baseline</span>
          <div className="text-2xl font-bold text-slate-200 mt-1">{check.baseline_score}%</div>
        </div>

        <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-4 text-center">
          <span className="text-[11px] font-medium text-indigo-300">Retention Score</span>
          <div className="text-2xl font-bold text-white mt-1">{check.score}%</div>
        </div>

        <div
          className={`rounded-xl border p-4 text-center ${
            isPositive
              ? "border-emerald-800/40 bg-emerald-950/20"
              : "border-rose-800/40 bg-rose-950/20"
          }`}
        >
          <span className="text-[11px] font-medium text-slate-400">Performance Delta</span>
          <div
            className={`text-2xl font-bold mt-1 ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {deltaSign}
            {delta}% pts
          </div>
        </div>
      </div>

      {/* Retention Status & Product Feedback Card */}
      <Card className="border-slate-800 bg-slate-900/60 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Retention Evaluation</span>
            <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${statusBadgeColor}`}>
              {classification.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <CardTitle className="text-sm font-semibold text-white pt-2">
            Observation & Analysis
          </CardTitle>
          <CardDescription className="text-xs text-slate-300 leading-relaxed pt-1">
            {classification.message}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Revision Trigger Card (if performance dropped) */}
      {revisionItem && (
        <Card className="border-rose-800/50 bg-rose-950/20 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-sm font-bold text-white">
                  Targeted Revision Scheduled
                </CardTitle>
                <CardDescription className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Due to the concept decay detected on this retention check, a revision item has been added to your Learning Plan.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="p-3 rounded-lg border border-rose-900/60 bg-slate-950/60 text-xs space-y-1">
              <div className="font-semibold text-white">{revisionItem.title}</div>
              <div className="text-slate-400 text-[11px]">{revisionItem.description}</div>
              <div className="text-[10px] text-rose-300/80 pt-1">
                Trigger reason: {revisionItem.reason}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        {revisionItem ? (
          <Link href="/student/plan" className="w-full sm:w-auto flex-1">
            <Button className="w-full text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5 shadow-md">
              <RotateCcw className="h-3.5 w-3.5" />
              Start Revision in Learning Plan
            </Button>
          </Link>
        ) : (
          <Link href="/student/plan" className="w-full sm:w-auto flex-1">
            <Button className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5 shadow-md">
              Continue Learning Plan
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}

        <Link href="/student/retention" className="w-full sm:w-auto flex-1">
          <Button variant="outline" className="w-full text-xs border-slate-700 text-slate-300">
            View All Retention Checks
          </Button>
        </Link>
      </div>
    </div>
  );
}
