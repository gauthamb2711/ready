"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  BookOpen,
  Layers,
  Sparkles,
  Target,
  FileQuestion,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { TeacherSubject } from "@/types/database.types";
import type { CurriculumTreeUnit } from "@/lib/services/teacher.service";

interface Props {
  subject: TeacherSubject;
  initialCurriculum: CurriculumTreeUnit[];
  isVerified: boolean;
}

export function TeacherCurriculumBuilder({ subject, initialCurriculum, isVerified }: Props) {
  const [curriculum, setCurriculum] = React.useState<CurriculumTreeUnit[]>(initialCurriculum);
  const [expandedUnits, setExpandedUnits] = React.useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = React.useState<Record<string, boolean>>({});

  // Unit modal
  const [showUnitModal, setShowUnitModal] = React.useState(false);
  const [unitTitle, setUnitTitle] = React.useState("");

  // Topic modal
  const [showTopicModal, setShowTopicModal] = React.useState(false);
  const [targetUnitId, setTargetUnitId] = React.useState<string | null>(null);
  const [topicTitle, setTopicTitle] = React.useState("");
  const [topicImportance, setTopicImportance] = React.useState<"CORE" | "IMPORTANT" | "SUPPLEMENTARY">("CORE");

  // Subtopic modal
  const [showSubtopicModal, setShowSubtopicModal] = React.useState(false);
  const [targetTopicId, setTargetTopicId] = React.useState<string | null>(null);
  const [subtopicTitle, setSubtopicTitle] = React.useState("");

  // Objective modal
  const [showObjectiveModal, setShowObjectiveModal] = React.useState(false);
  const [targetSubtopicId, setTargetSubtopicId] = React.useState<string | null>(null);
  const [objectiveDesc, setObjectiveDesc] = React.useState("");

  // Generator modal
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [genTopic, setGenTopic] = React.useState<{ id: string; title: string; unitId?: string } | null>(null);
  const [genCount, setGenCount] = React.useState(4);
  const [generating, setGenerating] = React.useState(false);
  const [genSuccess, setGenSuccess] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Toggle unit expansion
  function toggleUnit(unitId: string) {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  }

  // Toggle topic expansion
  function toggleTopic(topicId: string) {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  }

  // Add Unit
  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitTitle.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${subject.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "unit",
          title: unitTitle.trim(),
          sequence: curriculum.length + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add unit");

      const newUnit: CurriculumTreeUnit = {
        ...data.item,
        topics: [],
      };

      setCurriculum([...curriculum, newUnit]);
      setExpandedUnits((prev) => ({ ...prev, [newUnit.id]: true }));
      setUnitTitle("");
      setShowUnitModal(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error adding unit");
    } finally {
      setSubmitting(false);
    }
  }

  // Add Topic
  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicTitle.trim() || !targetUnitId) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${subject.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "topic",
          unitId: targetUnitId,
          title: topicTitle.trim(),
          importance: topicImportance,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add topic");

      const newTopic = { ...data.item, subtopics: [] };
      setCurriculum(
        curriculum.map((u) =>
          u.id === targetUnitId ? { ...u, topics: [...u.topics, newTopic] } : u
        )
      );
      setExpandedTopics((prev) => ({ ...prev, [newTopic.id]: true }));
      setTopicTitle("");
      setShowTopicModal(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error adding topic");
    } finally {
      setSubmitting(false);
    }
  }

  // Add Subtopic
  async function handleAddSubtopic(e: React.FormEvent) {
    e.preventDefault();
    if (!subtopicTitle.trim() || !targetTopicId) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${subject.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "subtopic",
          topicId: targetTopicId,
          title: subtopicTitle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add subtopic");

      const newSubtopic = { ...data.item, learningObjectives: [] };
      setCurriculum(
        curriculum.map((u) => ({
          ...u,
          topics: u.topics.map((t) =>
            t.id === targetTopicId ? { ...t, subtopics: [...t.subtopics, newSubtopic] } : t
          ),
        }))
      );
      setSubtopicTitle("");
      setShowSubtopicModal(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error adding subtopic");
    } finally {
      setSubmitting(false);
    }
  }

  // Add Learning Objective
  async function handleAddObjective(e: React.FormEvent) {
    e.preventDefault();
    if (!objectiveDesc.trim() || !targetSubtopicId) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${subject.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "objective",
          subtopicId: targetSubtopicId,
          description: objectiveDesc.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add objective");

      const newObj = data.item;
      setCurriculum(
        curriculum.map((u) => ({
          ...u,
          topics: u.topics.map((t) => ({
            ...t,
            subtopics: t.subtopics.map((st) =>
              st.id === targetSubtopicId
                ? { ...st, learningObjectives: [...st.learningObjectives, newObj] }
                : st
            ),
          })),
        }))
      );
      setObjectiveDesc("");
      setShowObjectiveModal(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error adding learning objective");
    } finally {
      setSubmitting(false);
    }
  }

  // Deterministic Question Generator
  async function handleGenerateQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (!genTopic) return;
    setGenerating(true);
    setGenSuccess(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/teacher/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle: genTopic.title,
          topicId: genTopic.id,
          subjectId: subject.id,
          unitId: genTopic.unitId,
          count: genCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate questions");

      setGenSuccess(
        `Generated ${data.questions.length} deterministic draft questions in your Question Bank!`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/teacher/subjects" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Subjects</span>
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-semibold">{subject.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{subject.name}</h1>
            {subject.code && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                {subject.code}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {subject.description || "Hierarchical syllabus and curriculum architecture."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/teacher/questions?subjectId=${subject.id}`}>
            <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300 gap-1.5">
              <FileQuestion className="h-3.5 w-3.5" />
              <span>View Subject Questions</span>
            </Button>
          </Link>

          <Button
            onClick={() => setShowUnitModal(true)}
            disabled={!isVerified}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Unit</span>
          </Button>
        </div>
      </div>

      {/* Curriculum Tree Explorer */}
      <div className="space-y-4">
        {curriculum.length === 0 ? (
          <Card className="border-slate-800 bg-slate-950/60 p-12 text-center">
            <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">No curriculum units yet</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
              A curriculum begins with Units (e.g. &quot;Lexical Analysis&quot;), followed by Topics, Subtopics, and Learning Objectives.
            </p>
            {isVerified && (
              <Button
                onClick={() => setShowUnitModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                Create First Unit
              </Button>
            )}
          </Card>
        ) : (
          curriculum.map((unit, uIdx) => {
            const isUnitExpanded = expandedUnits[unit.id] ?? true;

            return (
              <Card key={unit.id} className="border-slate-800 bg-slate-950/80 overflow-hidden">
                {/* Unit Header */}
                <div className="flex items-center justify-between p-4 bg-slate-900/60 border-b border-slate-800">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 select-none"
                    onClick={() => toggleUnit(unit.id)}
                  >
                    {isUnitExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Unit {uIdx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">{unit.title}</span>
                    <span className="text-[11px] text-slate-500">({unit.topics.length} topics)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTargetUnitId(unit.id);
                        setShowTopicModal(true);
                      }}
                      className="text-xs text-emerald-400 hover:bg-emerald-950/30 gap-1 h-7"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Topic</span>
                    </Button>
                  </div>
                </div>

                {/* Topics Container */}
                {isUnitExpanded && (
                  <div className="p-4 space-y-3">
                    {unit.topics.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-slate-800 text-center">
                        <p className="text-xs text-slate-500">No topics added to this unit yet.</p>
                      </div>
                    ) : (
                      unit.topics.map((topic, tIdx) => {
                        const isTopicExpanded = expandedTopics[topic.id] ?? true;

                        return (
                          <div
                            key={topic.id}
                            className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3"
                          >
                            {/* Topic Row */}
                            <div className="flex items-center justify-between gap-3">
                              <div
                                className="flex items-center gap-2 cursor-pointer select-none flex-1"
                                onClick={() => toggleTopic(topic.id)}
                              >
                                {isTopicExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                )}
                                <span className="text-xs font-semibold text-slate-200">
                                  {uIdx + 1}.{tIdx + 1} {topic.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] py-0 px-1.5 ${
                                    topic.importance === "CORE"
                                      ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/10"
                                      : "border-slate-700 text-slate-400"
                                  }`}
                                >
                                  {topic.importance}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Deterministic Question Generator Quick Action */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setGenTopic({ id: topic.id, title: topic.title, unitId: unit.id });
                                    setShowGenerateModal(true);
                                  }}
                                  className="text-[11px] h-7 border-slate-700 hover:border-indigo-500/40 text-indigo-300 gap-1"
                                >
                                  <Sparkles className="h-3 w-3 text-indigo-400" />
                                  <span>Generate Drafts</span>
                                </Button>

                                <Link href={`/teacher/questions/new?subjectId=${subject.id}&unitId=${unit.id}&topicId=${topic.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[11px] h-7 border-slate-700 hover:border-emerald-500/40 text-emerald-300 gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add Question</span>
                                  </Button>
                                </Link>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTargetTopicId(topic.id);
                                    setShowSubtopicModal(true);
                                  }}
                                  className="text-[11px] h-7 text-slate-400 hover:text-white"
                                >
                                  + Subtopic
                                </Button>
                              </div>
                            </div>

                            {/* Subtopics & Learning Objectives */}
                            {isTopicExpanded && (
                              <div className="pl-6 space-y-2 border-l border-slate-800">
                                {topic.subtopics.length === 0 ? (
                                  <p className="text-[11px] text-slate-500 italic">
                                    No subtopics specified.
                                  </p>
                                ) : (
                                  topic.subtopics.map((subtopic) => (
                                    <div
                                      key={subtopic.id}
                                      className="rounded bg-slate-950/60 p-2.5 border border-slate-800/80 space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                          <Target className="h-3 w-3 text-slate-500" />
                                          <span className="font-medium">{subtopic.title}</span>
                                        </div>

                                        <button
                                          onClick={() => {
                                            setTargetSubtopicId(subtopic.id);
                                            setShowObjectiveModal(true);
                                          }}
                                          className="text-[10px] text-emerald-400 hover:underline"
                                        >
                                          + Add Objective
                                        </button>
                                      </div>

                                      {/* Learning Objectives List */}
                                      {subtopic.learningObjectives.length > 0 && (
                                        <div className="pl-4 space-y-1">
                                          {subtopic.learningObjectives.map((lo, loIdx) => (
                                            <div
                                              key={lo.id}
                                              className="text-[11px] text-slate-400 flex items-start gap-1.5"
                                            >
                                              <span className="text-slate-600 font-mono text-[10px]">
                                                {loIdx + 1}.
                                              </span>
                                              <span>{lo.description}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">Add Curriculum Unit</h3>
            <form onSubmit={handleAddUnit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Unit Title *</label>
                <input
                  type="text"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  placeholder="e.g. Lexical Analysis"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnitModal(false)}
                  className="text-xs border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  Save Unit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">Add Curriculum Topic</h3>
            <form onSubmit={handleAddTopic} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Topic Title *</label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Lexical Analyzer & Regular Expressions"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Curriculum Importance</label>
                <select
                  value={topicImportance}
                  onChange={(e) => setTopicImportance(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="CORE">CORE (Essential Invariant)</option>
                  <option value="IMPORTANT">IMPORTANT (Key Concept)</option>
                  <option value="SUPPLEMENTARY">SUPPLEMENTARY (Enrichment)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTopicModal(false)}
                  className="text-xs border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  Save Topic
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subtopic Modal */}
      {showSubtopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">Add Subtopic</h3>
            <form onSubmit={handleAddSubtopic} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subtopic Title *</label>
                <input
                  type="text"
                  value={subtopicTitle}
                  onChange={(e) => setSubtopicTitle(e.target.value)}
                  placeholder="e.g. Tokens, Patterns, and Lexemes"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubtopicModal(false)}
                  className="text-xs border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  Save Subtopic
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Objective Modal */}
      {showObjectiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">Add Learning Objective</h3>
            <form onSubmit={handleAddObjective} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Objective Description *</label>
                <textarea
                  value={objectiveDesc}
                  onChange={(e) => setObjectiveDesc(e.target.value)}
                  rows={3}
                  placeholder="e.g. Identify and classify lexical tokens and resolve ambiguities in regular specifications."
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowObjectiveModal(false)}
                  className="text-xs border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  Save Objective
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deterministic Question Generator Modal */}
      {showGenerateModal && genTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-sm font-semibold text-white">Deterministic Question Generator</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scaffold template questions for <strong className="text-slate-200">{genTopic.title}</strong> using deterministic pedagogical templates.
              All generated questions are created in <span className="text-amber-400 font-mono">DRAFT</span> status for your review.
            </p>

            {genSuccess && (
              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{genSuccess}</span>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleGenerateQuestions} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Number of Questions (1-4)</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGenSuccess(null);
                  }}
                  className="text-xs border-slate-700"
                >
                  {genSuccess ? "Close" : "Cancel"}
                </Button>
                {!genSuccess && (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={generating}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                  >
                    {generating ? "Generating..." : "Generate Drafts"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
