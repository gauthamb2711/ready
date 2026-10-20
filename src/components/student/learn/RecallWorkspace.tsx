"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Brain,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { RecallActivity } from "@/lib/intelligence/action-content";

interface RecallWorkspaceProps {
  activities: RecallActivity[];
  onProceedToVerification: () => void;
}

export function RecallWorkspace({
  activities,
  onProceedToVerification,
}: RecallWorkspaceProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const handleInputChange = (id: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const handleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: true }));
  };

  const allCompleted = activities.length > 0 && activities.every((a) => revealed[a.id]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-5">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white">Active Retrieval Practice</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Strengthen memory retention by actively generating concepts and definitions from recall before checking the answer.
            </p>
          </div>
        </div>
      </div>

      {/* Activities list */}
      <div className="space-y-4">
        {activities.map((act, idx) => {
          const userVal = (answers[act.id] || "").trim();
          const isRevealed = revealed[act.id];
          const isMatch =
            isRevealed &&
            userVal.toLowerCase() === act.correctAnswer.trim().toLowerCase();

          return (
            <Card key={act.id} className="border-slate-800 bg-slate-900/60 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-800">
                    Retrieval Item {idx + 1} ({act.type.replace(/_/g, " ")})
                  </Badge>
                  {isRevealed && (
                    <Badge
                      variant={isMatch ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {isMatch ? "Accurate Recall" : "Review Required"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-medium text-white pt-2 leading-relaxed">
                  {act.prompt}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {act.options && act.options.length > 0 ? (
                  <RadioGroup
                    value={answers[act.id] || ""}
                    onValueChange={(val) => !isRevealed && handleInputChange(act.id, val)}
                    className="space-y-2"
                  >
                    {act.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        onClick={() => !isRevealed && handleInputChange(act.id, opt)}
                        className={`flex items-center space-x-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          answers[act.id] === opt
                            ? isRevealed
                              ? isMatch
                                ? "bg-emerald-950/40 border-emerald-600 text-white"
                                : "bg-rose-950/40 border-rose-600 text-white"
                              : "bg-indigo-950/40 border-indigo-600 text-white"
                            : "bg-slate-950/40 border-slate-800 text-slate-300"
                        }`}
                      >
                        <RadioGroupItem value={opt} id={`rec_${act.id}_${optIdx}`} />
                        <Label htmlFor={`rec_${act.id}_${optIdx}`} className="text-xs cursor-pointer flex-1">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Type the concept or term from memory..."
                      value={answers[act.id] || ""}
                      disabled={isRevealed}
                      onChange={(e) => handleInputChange(act.id, e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  </div>
                )}

                {/* Reveal button or feedback */}
                {!isRevealed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReveal(act.id)}
                    disabled={!userVal}
                    className="text-xs border-slate-700 h-8"
                  >
                    Submit & Check Memory
                  </Button>
                ) : (
                  <div
                    className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                      isMatch
                        ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                        : "bg-indigo-950/20 border-indigo-800/40 text-indigo-300"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {isMatch ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Accurately Recalled: {act.correctAnswer}
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 text-indigo-400" />
                          Expected Term: {act.correctAnswer}
                        </>
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {act.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion CTA */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white">Active Recall Completed</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            You have triggered active retrieval for all key concepts. Now measure your capability improvement.
          </p>
        </div>
        <Button
          onClick={onProceedToVerification}
          disabled={!allCompleted}
          className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold gap-1.5 px-6 whitespace-nowrap"
        >
          Verify Learning Gain
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
