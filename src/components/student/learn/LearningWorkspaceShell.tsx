"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Clock,
  Layers,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Play,
  TrendingUp,
} from "lucide-react";
import type { WorkspaceContext } from "@/lib/services/learning-workspace.service";
import type { ActionWorkspaceStage } from "@/types/database.types";
import { PreLearningVerification } from "./PreLearningVerification";
import { UnderstandWorkspace } from "./UnderstandWorkspace";
import { GuidedPracticeWorkspace } from "./GuidedPracticeWorkspace";
import { RecallWorkspace } from "./RecallWorkspace";
import { PostLearningVerification } from "./PostLearningVerification";

interface LearningWorkspaceShellProps {
  initialContext: WorkspaceContext;
}

export function LearningWorkspaceShell({ initialContext }: LearningWorkspaceShellProps) {
  const [context, setContext] = useState<WorkspaceContext>(initialContext);
  const [currentStage, setCurrentStage] = useState<ActionWorkspaceStage>(initialContext.stage);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active study timer tracking elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

  const handlePreVerificationComplete = (score: number) => {
    setCurrentStage("LEARNING_ACTIVE");
  };

  const handleProceedToPostVerification = () => {
    setCurrentStage("POST_VERIFICATION");
  };

  const { item, subject, topic, objective } = context;

  const ACTION_TYPE_LABELS: Record<string, string> = {
    UNDERSTAND: "Understand Concept",
    EXPLAIN: "Concept Explanation",
    EXAMPLE: "Worked Examples",
    GUIDED_PRACTICE: "Guided Practice",
    INDEPENDENT_PRACTICE: "Independent Practice",
    RECALL: "Active Recall",
    APPLICATION: "Application Problem",
    REVIEW: "Systematic Review",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/student/plan" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Learning Plan
          </Link>

          {/* Active study timer */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            <Clock className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>Time Spent: {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</span>
          </div>
        </div>

        {/* Workspace Card Header */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-xl space-y-3">
          {/* Breadcrumb Hierarchy: Subject -> Topic -> Objective */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-white font-semibold">{subject.name}</span>
            <span>&rarr;</span>
            <span className="text-indigo-300 font-medium">{topic.title}</span>
            {objective && (
              <>
                <span>&rarr;</span>
                <span className="text-slate-400 line-clamp-1">{objective.description}</span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                {item.title}
              </h1>
              <p className="text-xs text-slate-400">
                Action Type: <strong className="text-slate-300">{ACTION_TYPE_LABELS[item.action_type] || item.action_type}</strong>
                {" • "}
                Estimated Time: <strong className="text-slate-300">{item.estimated_minutes} minutes</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-indigo-300 border-indigo-800">
                State: {item.capability_state.replace(/_/g, " ")}
              </Badge>
              <Badge
                variant={
                  item.priority === "CRITICAL"
                    ? "destructive"
                    : item.priority === "HIGH"
                    ? "default"
                    : "secondary"
                }
                className="text-xs"
              >
                {item.priority}
              </Badge>
            </div>
          </div>

          {/* Reason for selection */}
          <div className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 mt-2">
            <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Why recommended: </strong>
              {item.reason}
            </div>
          </div>
        </div>

        {/* 3-Stage Progress Stepper */}
        <div className="grid grid-cols-3 gap-2">
          {/* Step 1 */}
          <div
            className={`p-3 rounded-lg border text-center transition-all ${
              currentStage === "PRE_VERIFICATION"
                ? "bg-indigo-950/40 border-indigo-600 text-white font-semibold"
                : "bg-slate-900/40 border-slate-800 text-slate-400"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Step 1</div>
            <div className="text-xs mt-0.5">Pre-Learning Verification</div>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3 rounded-lg border text-center transition-all ${
              currentStage === "LEARNING_ACTIVE"
                ? "bg-indigo-950/40 border-indigo-600 text-white font-semibold"
                : "bg-slate-900/40 border-slate-800 text-slate-400"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Step 2</div>
            <div className="text-xs mt-0.5">Learning Execution</div>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3 rounded-lg border text-center transition-all ${
              currentStage === "POST_VERIFICATION" || currentStage === "COMPLETED"
                ? "bg-emerald-950/40 border-emerald-600 text-white font-semibold"
                : "bg-slate-900/40 border-slate-800 text-slate-400"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Step 3</div>
            <div className="text-xs mt-0.5">Post-Learning Verification</div>
          </div>
        </div>
      </div>

      {/* Stage Views */}
      <div className="pt-2">
        {currentStage === "PRE_VERIFICATION" && (
          <PreLearningVerification
            itemId={item.id}
            topicTitle={topic.title}
            questions={context.preQuestions}
            onComplete={handlePreVerificationComplete}
          />
        )}

        {currentStage === "LEARNING_ACTIVE" && (
          <>
            {(item.action_type === "UNDERSTAND" ||
              item.action_type === "EXPLAIN" ||
              item.action_type === "EXAMPLE") &&
              context.understandContent && (
                <UnderstandWorkspace
                  content={context.understandContent}
                  onProceedToVerification={handleProceedToPostVerification}
                />
              )}

            {(item.action_type === "GUIDED_PRACTICE" ||
              item.action_type === "INDEPENDENT_PRACTICE" ||
              item.action_type === "APPLICATION") &&
              context.guidedPracticeQuestions && (
                <GuidedPracticeWorkspace
                  questions={context.guidedPracticeQuestions}
                  onProceedToVerification={handleProceedToPostVerification}
                />
              )}

            {(item.action_type === "RECALL" || item.action_type === "REVIEW") &&
              context.recallActivities && (
                <RecallWorkspace
                  activities={context.recallActivities}
                  onProceedToVerification={handleProceedToPostVerification}
                />
              )}
          </>
        )}

        {(currentStage === "POST_VERIFICATION" || currentStage === "COMPLETED") && (
          <PostLearningVerification
            itemId={item.id}
            topicTitle={topic.title}
            questions={context.postQuestions}
            preScore={context.preAssessment ? Number(context.preAssessment.score_percentage) : 30}
            actualMinutesSpent={elapsedMinutes}
          />
        )}
      </div>
    </div>
  );
}
