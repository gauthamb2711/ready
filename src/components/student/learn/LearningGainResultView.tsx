"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import type {
  LearningPlanItem,
  StudentSubject,
  CurriculumTopic,
  LearningGainRecord,
} from "@/types/database.types";

interface LearningGainResultViewProps {
  item: LearningPlanItem;
  subject: StudentSubject;
  topic: CurriculumTopic;
  learningGain: LearningGainRecord;
}

export function LearningGainResultView({
  item,
  subject,
  topic,
  learningGain,
}: LearningGainResultViewProps) {
  const isPositive = Number(learningGain.gain_points) > 0;
  const gainSign = isPositive ? "+" : "";

  const categoryColor =
    learningGain.category === "GAINED"
      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800"
      : learningGain.category === "IMPROVED"
      ? "text-indigo-400 bg-indigo-950/40 border-indigo-800"
      : "text-amber-400 bg-amber-950/40 border-amber-800";

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Verified Banner */}
      <div className="rounded-2xl border border-emerald-800/50 bg-gradient-to-b from-emerald-950/30 to-slate-900/60 p-6 text-center space-y-3 backdrop-blur-sm shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60">
          <Award className="h-7 w-7" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Capability Evidence Verified
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Learning Gain Measured
          </h1>
        </div>
        <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
          {learningGain.category_reason}
        </p>
      </div>

      {/* Main Gain Metrics Card */}
      <Card className="border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">
                {subject.name}
              </span>
              <CardTitle className="text-base font-bold text-white mt-0.5">
                {topic.title}
              </CardTitle>
            </div>
            <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-semibold ${categoryColor}`}>
              Status: {learningGain.category}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Comparison Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Before */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Before Learning
              </span>
              <div className="text-2xl font-bold text-slate-300">
                {learningGain.pre_score}%
              </div>
              <span className="text-[10px] text-slate-500">Baseline Assessment</span>
            </div>

            {/* After */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                After Learning
              </span>
              <div className="text-2xl font-bold text-white">
                {learningGain.post_score}%
              </div>
              <span className="text-[10px] text-slate-500">Post-Verification</span>
            </div>

            {/* Gain Points */}
            <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 space-y-1">
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Learning Gain
              </span>
              <div className="text-2xl font-extrabold text-emerald-400">
                {gainSign}{learningGain.gain_points}
              </div>
              <span className="text-[10px] text-emerald-500/80">Percentage Points</span>
            </div>
          </div>

          {/* Capability State Transition */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              Capability Classification Transition
            </span>
            <div className="flex items-center gap-3 text-xs pt-1">
              <Badge variant="outline" className="text-slate-400 border-slate-700">
                {learningGain.previous_capability_state?.replace(/_/g, " ") || "INITIAL"}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              <Badge variant="default" className="bg-indigo-600 font-semibold text-white">
                {learningGain.new_capability_state?.replace(/_/g, " ") || "KNOWN"}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              Your topic capability representation has been updated with verified post-learning evidence. Historical diagnostic records remain preserved.
            </p>
          </div>

          {/* Next Recommendation */}
          <div className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/60 flex items-start gap-2.5 text-xs text-slate-300">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Next Recommended Step: </strong>
              Continue with the next scheduled item in your personalized learning plan to sustain momentum.
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80 p-5 bg-slate-950/40">
          <Link href={`/student/subjects/${subject.id}`} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full text-xs border-slate-800 gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Review Subject Syllabus
            </Button>
          </Link>

          <Link href="/student/plan" className="w-full sm:w-auto">
            <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5 px-6">
              Continue Learning Plan
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
