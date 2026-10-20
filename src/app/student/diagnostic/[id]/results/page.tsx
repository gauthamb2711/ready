import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { getDiagnosticResults } from "@/lib/services/diagnostic.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Brain,
  Layers,
  Sparkles,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { CapabilityClassification } from "@/types/database.types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Diagnostic Capability Gap Results | READY",
  description: "Detailed current capability, target capability, capability gap, and topic breakdown.",
};

const CLASSIFICATION_COLORS: Record<
  CapabilityClassification,
  { bg: string; text: string; border: string; desc: string }
> = {
  STRONG: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    desc: "Consistent high diagnostic performance across multiple questions",
  },
  KNOWN: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    desc: "Demonstrated accurate conceptual understanding",
  },
  MISUNDERSTOOD: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    desc: "Incorrect conceptual execution; needs unlearning and targeted reconstruction",
  },
  FALSE_CONFIDENCE: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    desc: "High self-reported confidence contradicted by diagnostic failure",
  },
  FORGOTTEN: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    desc: "Prior preparation reported, but unable to recall key mechanics",
  },
  UNKNOWN: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    desc: "Low performance with low familiarity",
  },
  NOT_TESTED: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
    desc: "Insufficient diagnostic question evidence",
  },
};

export default async function DiagnosticResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await validateEcosystemAccess("STUDENT", "/student/diagnostic");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted"
          description={access.reason || "You must be authenticated to view diagnostic results."}
          backUrl="/student/subjects"
        />
      </AppShell>
    );
  }

  const { id } = await params;
  const results = await getDiagnosticResults(userId, id);

  if (!results) {
    notFound();
  }

  const { diagnostic, subject, topicStates } = results;

  const currentCap = diagnostic.score_percentage ?? 0;
  const targetCap = diagnostic.target_capability_score ?? 80;
  const gap = Math.max(0, targetCap - currentCap);

  // Group capability states by status
  const strongTopics = topicStates.filter((c) => c.classification === "STRONG" || c.classification === "KNOWN");
  const weakTopics = topicStates.filter(
    (c) =>
      c.classification === "UNKNOWN" ||
      c.classification === "MISUNDERSTOOD" ||
      c.classification === "FALSE_CONFIDENCE" ||
      c.classification === "FORGOTTEN"
  );

  const intake = diagnostic.intake_data || {};

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="space-y-6 max-w-5xl mx-auto py-2">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Brain className="h-6 w-6 text-indigo-400" />
                Diagnostic Capability Verification
              </h1>
              <Badge variant="default" className="bg-emerald-600/80 text-white">
                Completed
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Subject: <span className="text-white font-medium">{subject?.name || "Curriculum"}</span> &bull; Evaluated deterministically
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/student/subjects/${diagnostic.subject_id}`}>
              <Button variant="outline" size="sm" className="text-xs border-slate-800">
                Curriculum View
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Core Intelligence Cards: Current, Target, Gap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Current Capability */}
          <Card className="glass-card border-slate-800 bg-slate-900/60 shadow-lg">
            <CardHeader className="pb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                1. Current Capability
              </span>
              <CardTitle className="text-3xl font-extrabold text-white">
                {currentCap.toFixed(0)}%
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, currentCap)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Scored {diagnostic.correct_count} of {diagnostic.total_questions} questions correctly.
              </p>
            </CardContent>
          </Card>

          {/* 2. Target Capability */}
          <Card className="glass-card border-slate-800 bg-slate-900/60 shadow-lg">
            <CardHeader className="pb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                2. Target Capability
              </span>
              <CardTitle className="text-3xl font-extrabold text-indigo-300">
                {targetCap.toFixed(0)}%
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-400 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, targetCap)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Target Score: {intake.target_score || "80"}% &bull; Timing: {intake.exam_timing?.replace(/_/g, " ") || "Standard"}
              </p>
            </CardContent>
          </Card>

          {/* 3. Capability Gap */}
          <Card className="glass-card border-slate-800 bg-slate-900/60 shadow-lg">
            <CardHeader className="pb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                3. Capability Gap
              </span>
              <CardTitle className={`text-3xl font-extrabold ${gap > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                {gap.toFixed(0)}% pts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${gap > 20 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(100, gap)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Deficit between verified diagnostic baseline and desired target mastery.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Self-Reported Confidence vs Actual Performance Banner */}
        <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 backdrop-blur-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Intake Calibration Analysis</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Prior self-reported confidence was <span className="font-semibold text-indigo-300">{intake.confidence_level || "MEDIUM"}</span> with <span className="font-semibold text-indigo-300">{(intake.current_prep || "SOME_PREPARATION").replace(/_/g, " ")}</span> preparation. Actual baseline verified at <span className="font-semibold text-emerald-400">{currentCap.toFixed(0)}%</span>.
            </p>
          </div>
        </div>

        {/* Topic Capability Breakdown */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              Topic Capability Classifications
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Each topic is dynamically classified into 1 of 7 product intelligence states.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topicStates.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No individual topic states recorded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topicStates.map((state) => {
                  const style = CLASSIFICATION_COLORS[state.classification] || CLASSIFICATION_COLORS.NOT_TESTED;
                  const topicGap = Math.max(0, state.target_capability_score - state.current_capability_score);
                  const displayTitle = state.topic?.title || state.topic_id;

                  return (
                    <div
                      key={state.id}
                      className={`p-3.5 rounded-lg border ${style.border} ${style.bg} space-y-2`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {displayTitle}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold border ${style.border} ${style.text}`}
                        >
                          {state.classification.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                        <span>Current: {state.current_capability_score.toFixed(0)}%</span>
                        <span>Target: {state.target_capability_score.toFixed(0)}%</span>
                        <span className="font-semibold text-amber-300">
                          Gap: {topicGap.toFixed(0)}%
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-snug">{style.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Insights: Weak vs Strong Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Strong & Known Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strongTopics.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No topics classified as Strong yet.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  {strongTopics.map((t) => (
                    <li key={t.id} className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span>{t.topic?.title || t.topic_id}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800/40">
                        {t.current_capability_score.toFixed(0)}%
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Priority Remediation Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weakTopics.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No critical priority gaps detected.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  {weakTopics.map((t) => (
                    <li key={t.id} className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span>{t.topic?.title || t.topic_id}</span>
                      <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800/40">
                        {t.classification.replace(/_/g, " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* DAY 4 ACTIVE FEATURE: Continue to Learning Plan */}
        <Card className="border-indigo-600/60 bg-gradient-to-r from-indigo-950/60 to-slate-900/90 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Next Step: Personalized Learning Plan</h3>
                <Badge variant="default" className="text-[10px] bg-indigo-600">
                  Ready to Start
                </Badge>
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                Your diagnostic evidence has been evaluated. Ready has sequenced daily micro-actions to close your {gap.toFixed(0)}% point capability gap using your {subject?.available_daily_study_time || 60} min/day study budget.
              </p>
            </div>

            <Link href={`/student/plan?subjectId=${diagnostic.subject_id}`}>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-md">
                <span>Continue to Learning Plan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
