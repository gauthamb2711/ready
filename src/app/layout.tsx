import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "READY | Global Learning, Assessment & Skill Verification Platform",
  description:
    "A global SaaS platform establishing capability benchmarking, diagnostic assessment, and verified retention across students, teachers, professionals, candidates, colleges, and enterprise organizations.",
  keywords: [
    "Skill Verification",
    "Capability Benchmark",
    "Learning Platform",
    "Assessment Engine",
    "Multi-Tenant SaaS",
    "Retention Tracking",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`}>
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
