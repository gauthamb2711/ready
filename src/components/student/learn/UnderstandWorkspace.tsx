"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ListOrdered,
  HelpCircle,
} from "lucide-react";
import type { UnderstandContent } from "@/lib/intelligence/action-content";

interface UnderstandWorkspaceProps {
  content: UnderstandContent;
  onProceedToVerification: () => void;
}

export function UnderstandWorkspace({
  content,
  onProceedToVerification,
}: UnderstandWorkspaceProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedChecks, setRevealedChecks] = useState<Record<string, boolean>>({});

  const handleSelect = (checkId: string, val: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [checkId]: val }));
  };

  const handleReveal = (checkId: string) => {
    setRevealedChecks((prev) => ({ ...prev, [checkId]: true }));
  };

  return (
    <div className="space-y-8">
      {/* 1. Learning Objective */}
      <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Learning Objective
            </span>
            <h2 className="text-base font-semibold text-white mt-0.5">
              {content.learningObjective}
            </h2>
          </div>
        </div>
      </div>

      {/* 2. What you need to understand */}
      <Card className="border-slate-800 bg-slate-900/50 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Core Conceptual Foundation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80 text-slate-200">
            {content.whatYouNeedToUnderstand}
          </p>

          <div>
            <h4 className="font-semibold text-white mb-2">Key Principles</h4>
            <ul className="space-y-2">
              {content.keyConcepts.map((concept, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 3. Simple Explanation & Concrete Example */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Intuitive Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-300 leading-relaxed">
            {content.simpleExplanation}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Concrete Example
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
            {content.example}
          </CardContent>
        </Card>
      </div>

      {/* 4. Worked Example (Step by Step) */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3 border-b border-slate-800/80">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-emerald-400" />
            Step-by-Step Worked Example
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {content.workedExample.problem}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3">
            {content.workedExample.steps.map((st) => (
              <div
                key={st.stepNumber}
                className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800">
                    Step {st.stepNumber}
                  </Badge>
                  <span className="text-xs font-semibold text-white">{st.title}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-1">
                  {st.explanation}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              <strong>Conclusion: </strong>
              {content.workedExample.conclusion}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Common Mistakes */}
      {content.commonMistakes.length > 0 && (
        <Card className="border-amber-900/40 bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Common Misconceptions & Corrections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {content.commonMistakes.map((m, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-amber-900/30 bg-slate-950/40 text-xs"
              >
                <div className="text-rose-300 space-y-1">
                  <span className="font-semibold text-[10px] uppercase text-rose-400">
                    Mistake:
                  </span>
                  <p>{m.mistake}</p>
                </div>
                <div className="text-emerald-300 space-y-1 sm:border-l sm:border-slate-800 sm:pl-3">
                  <span className="font-semibold text-[10px] uppercase text-emerald-400">
                    Correction:
                  </span>
                  <p>{m.correction}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 6. Quick Check Mini-Assessment */}
      {content.quickCheck.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Quick Check Verification</h3>
          </div>

          {content.quickCheck.map((qc, idx) => {
            const isRevealed = revealedChecks[qc.id];
            const chosen = selectedAnswers[qc.id];
            const isCorrect = chosen === qc.correctAnswer;

            return (
              <Card key={qc.id} className="border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-white leading-relaxed">
                    Check {idx + 1}: {qc.prompt}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <RadioGroup
                    value={chosen || ""}
                    onValueChange={(val) => handleSelect(qc.id, val)}
                    className="space-y-2"
                  >
                    {qc.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        onClick={() => !isRevealed && handleSelect(qc.id, opt)}
                        className={`flex items-center space-x-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          chosen === opt
                            ? isRevealed
                              ? isCorrect
                                ? "bg-emerald-950/30 border-emerald-600 text-white"
                                : "bg-rose-950/30 border-rose-600 text-white"
                              : "bg-indigo-950/30 border-indigo-600 text-white"
                            : "bg-slate-950/40 border-slate-800 text-slate-300"
                        }`}
                      >
                        <RadioGroupItem value={opt} id={`${qc.id}_${optIdx}`} />
                        <Label htmlFor={`${qc.id}_${optIdx}`} className="text-xs cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {!isRevealed ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReveal(qc.id)}
                      disabled={!chosen}
                      className="text-xs border-slate-700 h-7"
                    >
                      Check Answer
                    </Button>
                  ) : (
                    <div
                      className={`p-3 rounded-md text-xs border ${
                        isCorrect
                          ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                          : "bg-rose-950/20 border-rose-800/40 text-rose-300"
                      }`}
                    >
                      <div className="font-semibold mb-1">
                        {isCorrect ? "Correct!" : `Incorrect. Expected: ${qc.correctAnswer}`}
                      </div>
                      <p className="text-slate-300">{qc.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completion CTA */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white">Conceptual Understanding Complete</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            You have reviewed the core concepts and worked example. Now verify your learning gain.
          </p>
        </div>
        <Button
          onClick={onProceedToVerification}
          className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5 px-6 whitespace-nowrap"
        >
          Verify Learning Gain
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
