"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FolderPlus,
  Plus,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ListTree,
  Target,
  Loader2,
  CheckCircle2
} from "lucide-react";
import type {
  CurriculumHierarchyUnit,
} from "@/lib/services/student-subject.service";
import type { LearningObjective } from "@/types/database.types";

interface CurriculumManagerProps {
  subjectId: string;
  initialUnits: CurriculumHierarchyUnit[];
}

export function CurriculumManager({ subjectId, initialUnits }: CurriculumManagerProps) {
  const [units, setUnits] = useState<CurriculumHierarchyUnit[]>(initialUnits);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    initialUnits.forEach((u) => {
      init[u.id] = true;
    });
    return init;
  });

  // Modal / Form state for adding units
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitNumber, setUnitNumber] = useState(units.length + 1);

  // Adding topic state
  const [addingTopicUnitId, setAddingTopicUnitId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicCode, setTopicCode] = useState("");

  // Adding subtopic state
  const [addingSubtopicTopicId, setAddingSubtopicTopicId] = useState<string | null>(null);
  const [subtopicTitle, setSubtopicTitle] = useState("");

  // Adding objective state
  const [addingObjectiveSubtopicId, setAddingObjectiveSubtopicId] = useState<string | null>(null);
  const [objectiveText, setObjectiveText] = useState("");
  const [bloomLevel, setBloomLevel] = useState("UNDERSTAND");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/student/subjects/${subjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_unit",
          title: unitTitle.trim(),
          unitNumber: Number(unitNumber),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add unit");

      setUnits((prev) => [...prev, { ...data.unit, topics: [] }]);
      setExpandedUnits((prev) => ({ ...prev, [data.unit.id]: true }));
      setUnitTitle("");
      setUnitNumber(units.length + 2);
      setIsAddingUnit(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async (unitId: string) => {
    if (!topicTitle.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/student/subjects/${subjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_topic",
          unitId,
          title: topicTitle.trim(),
          topicCode: topicCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add topic");

      setUnits((prev) =>
        prev.map((u) => {
          if (u.id === unitId) {
            return {
              ...u,
              topics: [...u.topics, { ...data.topic, subtopics: [] }],
            };
          }
          return u;
        })
      );

      setAddingTopicUnitId(null);
      setTopicTitle("");
      setTopicCode("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubtopic = async (topicId: string, unitId: string) => {
    if (!subtopicTitle.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/student/subjects/${subjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_subtopic",
          topicId,
          title: subtopicTitle.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add subtopic");

      setUnits((prev) =>
        prev.map((u) => {
          if (u.id === unitId) {
            return {
              ...u,
              topics: u.topics.map((t) => {
                if (t.id === topicId) {
                  return {
                    ...t,
                    subtopics: [...t.subtopics, { ...data.subtopic, learningObjectives: [] }],
                  };
                }
                return t;
              }),
            };
          }
          return u;
        })
      );

      setAddingSubtopicTopicId(null);
      setSubtopicTitle("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateObjective = async (subtopicId: string, topicId: string, unitId: string) => {
    if (!objectiveText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/student/subjects/${subjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_learning_objective",
          subtopicId,
          objectiveText: objectiveText.trim(),
          bloomTaxonomyLevel: bloomLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add objective");

      setUnits((prev) =>
        prev.map((u) => {
          if (u.id === unitId) {
            return {
              ...u,
              topics: u.topics.map((t) => {
                if (t.id === topicId) {
                  return {
                    ...t,
                    subtopics: t.subtopics.map((st) => {
                      if (st.id === subtopicId) {
                        return {
                          ...st,
                          learningObjectives: [...(st.learningObjectives || []), data.objective],
                        };
                      }
                      return st;
                    }),
                  };
                }
                return t;
              }),
            };
          }
          return u;
        })
      );

      setAddingObjectiveSubtopicId(null);
      setObjectiveText("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md">
          {error}
        </div>
      )}

      {units.length === 0 && !isAddingUnit ? (
        <Card className="border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
          <ListTree className="h-10 w-10 text-indigo-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-white">No curriculum structure yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Build your syllabus tree starting with Unit 1 (e.g., Syntax Analysis, Linear Algebra, Process Synchronization).
          </p>
          <Button
            size="sm"
            onClick={() => setIsAddingUnit(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Unit
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {units.map((unit) => {
            const isExpanded = !!expandedUnits[unit.id];
            return (
              <div
                key={unit.id}
                className="border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden shadow-sm transition-all"
              >
                {/* Unit Header Bar */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/40 select-none"
                  onClick={() => toggleUnit(unit.id)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUnit(unit.id);
                      }}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                          Unit {unit.sequence || 1}
                        </span>
                        <h3 className="text-sm font-semibold text-white">{unit.title}</h3>
                        <Badge variant="outline" className="text-[10px] text-slate-400">
                          {unit.topics.length} Topics
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddingTopicUnitId(unit.id)}
                      className="h-7 text-xs text-indigo-400 hover:text-indigo-300 gap-1 px-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add Topic
                    </Button>
                  </div>
                </div>

                {/* Unit Body (Topics & Hierarchy) */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 space-y-4">
                    {/* Add Topic Inline Form */}
                    {addingTopicUnitId === unit.id && (
                      <div className="p-3 bg-slate-900/80 rounded-lg border border-indigo-700/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-300">Add Topic to Unit {unit.sequence || 1}</span>
                          <button
                            onClick={() => setAddingTopicUnitId(null)}
                            className="text-xs text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input
                            placeholder="Topic title (e.g. LR Parsing)"
                            value={topicTitle}
                            onChange={(e) => setTopicTitle(e.target.value)}
                            className="sm:col-span-2 text-xs h-8 bg-slate-950/80"
                          />
                          <Input
                            placeholder="Importance (CORE, FOUNDATIONAL)"
                            value={topicCode}
                            onChange={(e) => setTopicCode(e.target.value)}
                            className="text-xs h-8 bg-slate-950/80"
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            disabled={loading || !topicTitle.trim()}
                            onClick={() => handleCreateTopic(unit.id)}
                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500"
                          >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Topic"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {unit.topics.length === 0 && addingTopicUnitId !== unit.id ? (
                      <p className="text-xs text-slate-500 italic pl-6">
                        No topics defined in this unit yet. Click "Add Topic" to begin.
                      </p>
                    ) : (
                      <div className="space-y-3 pl-4 border-l border-slate-800">
                        {unit.topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3.5 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                                  <h4 className="text-xs font-semibold text-white">{topic.title}</h4>
                                  {topic.importance && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {topic.importance}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {topic.subtopics.length} Subtopics
                                </span>
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setAddingSubtopicTopicId(topic.id)}
                                className="h-6 text-[11px] text-indigo-400 hover:text-indigo-300 gap-1 px-1.5"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                Subtopic
                              </Button>
                            </div>

                            {/* Add Subtopic Form */}
                            {addingSubtopicTopicId === topic.id && (
                              <div className="p-2 bg-slate-950/80 rounded border border-indigo-700/30 space-y-2">
                                <Input
                                  placeholder="Subtopic title (e.g. LR(1) Parsers)"
                                  value={subtopicTitle}
                                  onChange={(e) => setSubtopicTitle(e.target.value)}
                                  className="text-xs h-7 bg-slate-900"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAddingSubtopicTopicId(null)}
                                    className="h-6 text-[10px]"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={loading || !subtopicTitle.trim()}
                                    onClick={() => handleCreateSubtopic(topic.id, unit.id)}
                                    className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-500"
                                  >
                                    Save Subtopic
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Subtopics List */}
                            {topic.subtopics.length > 0 && (
                              <div className="space-y-2 pl-3 border-l border-slate-800/80 mt-2">
                                {topic.subtopics.map((subtopic) => (
                                  <div
                                    key={subtopic.id}
                                    className="p-2.5 rounded bg-slate-950/50 border border-slate-800/60 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-slate-200">
                                        &bull; {subtopic.title}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setAddingObjectiveSubtopicId(subtopic.id)}
                                        className="h-5 text-[10px] text-indigo-400 hover:text-indigo-300 px-1 gap-1"
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                        Objective
                                      </Button>
                                    </div>

                                    {/* Add Learning Objective Form */}
                                    {addingObjectiveSubtopicId === subtopic.id && (
                                      <div className="p-2 bg-slate-900/90 rounded border border-indigo-700/40 space-y-1.5">
                                        <Input
                                          placeholder="e.g. Construct and analyze an LR(1) parsing table."
                                          value={objectiveText}
                                          onChange={(e) => setObjectiveText(e.target.value)}
                                          className="text-xs h-7 bg-slate-950"
                                        />
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                            <span>Bloom Level:</span>
                                            <select
                                              value={bloomLevel}
                                              onChange={(e) => setBloomLevel(e.target.value)}
                                              className="bg-slate-950 border border-slate-800 rounded px-1 text-slate-200 text-[10px]"
                                            >
                                              <option value="REMEMBER">Remember</option>
                                              <option value="UNDERSTAND">Understand</option>
                                              <option value="APPLY">Apply</option>
                                              <option value="ANALYZE">Analyze</option>
                                              <option value="EVALUATE">Evaluate</option>
                                            </select>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setAddingObjectiveSubtopicId(null)}
                                              className="h-5 text-[10px]"
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              size="sm"
                                              disabled={loading || !objectiveText.trim()}
                                              onClick={() =>
                                                handleCreateObjective(subtopic.id, topic.id, unit.id)
                                              }
                                              className="h-5 text-[10px] bg-indigo-600 hover:bg-indigo-500"
                                            >
                                              Save
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Objectives */}
                                    {subtopic.learningObjectives && subtopic.learningObjectives.length > 0 && (
                                      <div className="space-y-1 pl-2">
                                        {subtopic.learningObjectives.map((obj) => (
                                          <div
                                            key={obj.id}
                                            className="flex items-start gap-1.5 text-[11px] text-slate-400"
                                          >
                                            <Target className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                                            <span>{obj.description}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unit Creation Bar */}
          {isAddingUnit ? (
            <Card className="border border-indigo-700/50 bg-slate-900/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white">Add Curriculum Unit</h4>
                <button
                  onClick={() => setIsAddingUnit(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Unit Number</Label>
                  <Input
                    type="number"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(Number(e.target.value))}
                    className="text-xs h-8 bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[11px] text-slate-400">Unit Title</Label>
                  <Input
                    placeholder="e.g. Syntax Analysis & Parsing Algorithms"
                    value={unitTitle}
                    onChange={(e) => setUnitTitle(e.target.value)}
                    className="text-xs h-8 bg-slate-950"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingUnit(false)}
                  className="text-xs h-7"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={loading || !unitTitle.trim()}
                  onClick={handleCreateUnit}
                  className="text-xs h-7 bg-indigo-600 hover:bg-indigo-500"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Unit"}
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingUnit(true)}
              className="w-full border-dashed border-slate-800 hover:border-slate-700 text-xs py-4 text-slate-400 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Another Unit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
