"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  FileCheck2,
  Stethoscope,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { lang, setActiveRole, setActiveUserId } = useApp();

  return (
    <div className="space-y-24 py-6 max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8 pb-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Clinical Decision Support System (CDSS)</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Personalized cognitive tracking. Without population bias.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
          BrainBaseline measures change against your own established baseline rather than static test scores—reducing false alarms and catching treatable causes first.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            onClick={() => {
              setActiveRole("participant");
              setActiveUserId("user_sara");
              router.push("/check");
            }}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-medium text-sm transition flex items-center gap-2 shadow-xs"
          >
            <span>Start Check-In</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveRole("clinician");
              setActiveUserId("user_layla");
              router.push("/clinician");
            }}
            className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-sm transition"
          >
            Clinician Portal
          </button>
        </div>
      </section>

      {/* 3 Core Principles */}
      <section className="border-t border-slate-200 dark:border-slate-800 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Activity className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Within-Person Baseline
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Eliminates language and formal education bias by calibrating your trajectory against your past verified sessions.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Stethoscope className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Reversible Causes First
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Filters temporary drops caused by poor sleep, vitamin B12/thyroid deficiency, or sensory loss before specialty referrals.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <FileCheck2 className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Clinician Review Gate
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Unverified flags are held for physician sign-off and accompanied by 1-click EHR export and CPT 96138 billing notes.
            </p>
          </div>
        </div>
      </section>

      {/* Select Portal Banner */}
      <section className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Ready to access your workspace?
          </h2>
          <p className="text-sm text-slate-500">
            Sign in as a participant, attending physician, or healthcare administrator.
          </p>
        </div>

        <button
          onClick={() => router.push("/auth")}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-medium text-xs transition flex items-center gap-2 shrink-0"
        >
          <span>Select Portal</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}
