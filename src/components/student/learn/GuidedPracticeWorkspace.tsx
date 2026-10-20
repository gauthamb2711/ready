"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  ListOrdered,
  ChevronRight,
} from "lucide-react";
import type { GuidedPracticeQuestion } from "@/lib/intelligence/action-content";

interface GuidedPracticeWorkspaceProps {
  questions: GuidedPracticeQuestion[];
  onProceedToVerification: () => void;
}

export function GuidedPracticeWorkspace({
  questions,
  onProceedToVerification,
}: GuidedPracticeWorkspaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];
  const isCurrentSubmitted = currentQ && submittedQuestions[currentQ.id];
  const chosen = currentQ ? selectedAnswers[currentQ.id] : "";
  const isCorrect = currentQ && chosen === currentQ.correctAnswer;

  const handleSelect = (val: string) => {
    if (isCurrentSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  };

  const handleToggleHint = (qId: string) => {
    setRevealedHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmitAnswer = () => {
    if (!chosen) return;
    setSubmittedQuestions((prev) => ({ ...prev, [currentQ.id]: true }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  // Practice Summary stats
  const totalAttempted = Object.keys(submittedQuestions).length;
  const correctCount = questions.filter(
    (q) => submittedQuestions[q.id] && selectedAnswers[q.id] === q.correctAnswer
  ).length;

  if (isFinished) {
    return (
      <Card className="border-slate-800 bg-slate-900/60 p-6 text-center space-y-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Guided Practice Complete</h3>
          <p className="text-xs text-slate-400 mt-1">
            You practiced {questions.length} problems with step-by-step guidance.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-[10px] uppercase text-slate-400">Accuracy</span>
            <div className="text-xl font-bold text-white mt-0.5">
              {Math.round((correctCount / Math.max(1, totalAttempted)) * 100)}%
            </div>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span className="text-[10px] uppercase text-slate-400">Solved Correctly</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {correctCount} / {questions.length}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Now take the Post-Learning Verification to formally verify and measure your capability gain.
        </p>

        <Button
          onClick={onProceedToVerification}
          className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5 px-6"
        >
          Verify Learning Gain
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Card>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="space-y-6">
      {/* Header Tracker */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs text-indigo-400 border-indigo-800">
            Practice Problem {currentIndex + 1} of {questions.length}
          </Badge>
          <span className="text-xs text-slate-400">Interactive Guided Steps</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToggleHint(currentQ.id)}
          className="text-xs text-amber-400 hover:text-amber-300 gap-1.5 h-7"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {revealedHints[currentQ.id] ? "Hide Hint" : "Need a Hint?"}
        </Button>
      </div>

      {/* Hint Banner if toggled */}
      {revealedHints[currentQ.id] && (
        <div className="p-3.5 rounded-lg border border-amber-900/40 bg-amber-950/20 text-xs text-amber-200 space-y-1 animate-in fade-in">
          <div className="font-semibold flex items-center gap-1.5 text-amber-300">
            <Lightbulb className="h-3.5 w-3.5" />
            Guidance Hint:
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
            {currentQ.hints.map((h, hIdx) => (
              <li key={hIdx}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Question Card */}
      <Card className="border-slate-800 bg-slate-900/60 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white leading-relaxed">
            {currentQ.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <RadioGroup
            value={chosen || ""}
            onValueChange={handleSelect}
            className="space-y-2.5"
          >
            {currentQ.options.map((opt, optIdx) => (
              <div
                key={optIdx}
                onClick={() => handleSelect(opt)}
                className={`flex items-center space-x-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  chosen === opt
                    ? isCurrentSubmitted
                      ? isCorrect
                        ? "bg-emerald-950/40 border-emerald-600 text-white"
                        : "bg-rose-950/40 border-rose-600 text-white"
                      : "bg-indigo-950/40 border-indigo-600 text-white"
                    : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900"
                }`}
              >
                <RadioGroupItem value={opt} id={`gp_${currentQ.id}_${optIdx}`} />
                <Label htmlFor={`gp_${currentQ.id}_${optIdx}`} className="text-xs cursor-pointer flex-1">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Feedback & Step by step solution upon submission */}
          {isCurrentSubmitted && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-3 mt-4 ${
                isCorrect
                  ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                  : "bg-rose-950/20 border-rose-800/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Correct Answer!
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-400" />
                    Incorrect. Expected: {currentQ.correctAnswer}
                  </>
                )}
              </div>
              <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>

              {/* Step by step breakdown */}
              {currentQ.stepByStepSolution.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                  <div className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                    <ListOrdered className="h-3.5 w-3.5 text-indigo-400" />
                    Step-by-Step Logic:
                  </div>
                  <ul className="space-y-1 text-slate-300">
                    {currentQ.stepByStepSolution.map((s, sIdx) => (
                      <li key={sIdx} className="text-[11px]">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-slate-800/80 pt-4">
          <span className="text-[11px] text-slate-400">
            {isCurrentSubmitted ? "Solution reviewed" : "Select an option to evaluate"}
          </span>

          {!isCurrentSubmitted ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={!chosen}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold h-8 px-4"
            >
              Check Answer
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold h-8 px-4 gap-1"
            >
              {currentIndex < questions.length - 1 ? "Next Problem" : "Review Summary"}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
