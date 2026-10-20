import Link from "next/link";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  BookOpen,
  Award,
  Briefcase,
  Building2,
  Building,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Layers,
  ChevronRight,
} from "lucide-react";
import { ACCOUNT_TYPES } from "@/lib/rbac/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "READY | Global Learning, Assessment & Skill Verification Platform",
  description:
    "A unified SaaS platform for capability benchmarking, gap analysis, and verified retention across students, teachers, professionals, candidates, colleges, and enterprises.",
};

export default async function HomePage() {
  const authContext = await getServerAuthContext();
  const isAuthenticated = !!authContext;
  const userAccountType = authContext?.profile?.account_type || "STUDENT";
  const userDefaultPath = ACCOUNT_TYPES[userAccountType]?.defaultPath || "/student";

  const ecosystems = [
    {
      type: "STUDENT",
      name: "Student Ecosystem",
      tagline: "Personalized Capability",
      desc: "Diagnose capability gaps, follow adaptive learning plans, and retain verified skills.",
      icon: GraduationCap,
      href: "/student",
      accent: "from-blue-500/20 to-indigo-500/10",
      border: "border-blue-500/30",
    },
    {
      type: "TEACHER",
      name: "Teacher / Faculty",
      tagline: "Curriculum & Assessments",
      desc: "Author standardized syllabi, build calibrated question banks, and evaluate student milestones.",
      icon: BookOpen,
      href: "/teacher",
      accent: "from-indigo-500/20 to-purple-500/10",
      border: "border-indigo-500/30",
    },
    {
      type: "PROFESSIONAL",
      name: "Professional Ecosystem",
      tagline: "Targeted Upskilling",
      desc: "Micro-learning pathways tailored to industry capability standards with retention verification.",
      icon: Award,
      href: "/professional",
      accent: "from-emerald-500/20 to-teal-500/10",
      border: "border-emerald-500/30",
    },
    {
      type: "CANDIDATE",
      name: "Candidate Ecosystem",
      tagline: "Verified Benchmarks",
      desc: "Standardized skill testing, tamper-proof credential scorecards, and recruiter discovery.",
      icon: Briefcase,
      href: "/candidate",
      accent: "from-amber-500/20 to-orange-500/10",
      border: "border-amber-500/30",
    },
    {
      type: "COLLEGE_UNIVERSITY",
      name: "College / University",
      tagline: "Institutional Multi-Tenant",
      desc: "Department hierarchy, accredited programs, faculty administration, and cohort analytics.",
      icon: Building2,
      href: "/college",
      accent: "from-violet-500/20 to-fuchsia-500/10",
      border: "border-violet-500/30",
    },
    {
      type: "COMPANY",
      name: "Company / Organization",
      tagline: "Workforce & Talent Pipeline",
      desc: "Workforce competency matrices, employee upskilling, and hiring pipeline evaluation.",
      icon: Building,
      href: "/company",
      accent: "from-cyan-500/20 to-blue-500/10",
      border: "border-cyan-500/30",
    },
  ];

  const capabilitySteps = [
    { label: "Current Capability", sub: "Baseline Diagnostic" },
    { label: "Target Capability", sub: "Outcome Definition" },
    { label: "Gap Analysis", sub: "Deficit Identification" },
    { label: "Personalized Plan", sub: "Structured Roadmap" },
    { label: "Focused Action", sub: "Guided Execution" },
    { label: "Rigorous Assessment", sub: "Objective Verification" },
    { label: "Cognitive Change", sub: "Concept Mastery" },
    { label: "Retention Index", sub: "Spaced Reinforcement" },
    { label: "Verified Capability", sub: "Accredited Proof" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-mesh-radial">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-xl md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-black tracking-wider text-white shadow-md shadow-indigo-600/30">
            R
          </div>
          <span className="text-lg font-black tracking-tight text-white">READY</span>
          <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
            Day 1 Architecture
          </Badge>
        </div>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden md:inline">
                Signed in as <strong className="text-slate-200">{authContext.profile?.email}</strong>
              </span>
              <Link href={userDefaultPath}>
                <Button variant="primary" size="sm" className="gap-2">
                  <span>Enter Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 text-center max-w-5xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Global Learning, Assessment & Skill Verification Platform</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Current Capability to <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
            Verified Capability.
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          READY provides unified capability benchmarking, diagnostic assessment, and retention tracking across students, faculty, professionals, and enterprise organizations.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href={isAuthenticated ? userDefaultPath : "/signup"}>
            <Button variant="primary" size="lg" className="gap-2">
              <span>{isAuthenticated ? "Go to Workspace" : "Begin Verification"}</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign In to Ecosystem
            </Button>
          </Link>
        </div>
      </section>

      {/* Core Product Principle Pipeline */}
      <section className="max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 backdrop-blur-md">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
                Core Architecture Framework
              </span>
              <h3 className="text-xl font-bold text-white mt-1">The READY Capability Pipeline</h3>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Closed-Loop Verification
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3 pt-6">
            {capabilitySteps.map((step, idx) => (
              <div
                key={step.label}
                className="relative rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-2">
                  <span>0{idx + 1}</span>
                  {idx === capabilitySteps.length - 1 && (
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-snug">{step.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Six Ecosystems Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12 w-full space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
            Dedicated Workspaces
          </span>
          <h2 className="text-3xl font-extrabold text-white">Six Independent Ecosystems</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Isolated tenant boundaries and role-based access control protecting every stage of learning and verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {ecosystems.map((eco) => {
            const Icon = eco.icon;
            return (
              <Link
                key={eco.type}
                href={eco.href}
                className={`group rounded-xl border ${eco.border} bg-gradient-to-b ${eco.accent} p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-white shadow-md">
                    <Icon className="h-5 w-5 text-indigo-300" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {eco.tagline}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-200 transition-colors">
                  {eco.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{eco.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Enter Ecosystem</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-300">READY</span> &copy; 2026. Global Learning, Assessment & Skill Verification Platform.
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Student Privacy By Default</span>
            <span>&bull;</span>
            <span>Multi-Tenant RLS</span>
            <span>&bull;</span>
            <span>Deny-by-Default RBAC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
