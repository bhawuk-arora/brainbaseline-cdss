"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, ParticipantResultResponse } from "@/lib/api";
import {
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Stethoscope,
  Activity,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function ResultPage() {
  const { lang, activeUserId, isAuthenticated, t } = useApp();
  const router = useRouter();

  // Authentication Route Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, router]);

  const [data, setData] = useState<ParticipantResultResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadResult = () => {
    setLoading(true);
    api
      .getUserResult(activeUserId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load result:", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadResult();
  }, [activeUserId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-24 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading your vitality profile...</p>
      </div>
    );
  }

  if (!data) return null;

  // CLINICIAN HOLD STATE (Gate 5)
  if (data.status === "pending_clinician_review") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-5 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-700 dark:text-slate-300">
            <Clock className="w-6 h-6 text-teal-600" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-md">
              Clinical Quality Review Active
            </span>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight pt-1">
              Your Session is Being Reviewed
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-normal">
              A licensed clinician reviews all baseline variations and rules out reversible factors (sleep, thyroid, sensory) before final plan sign-off.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={loadResult}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
            >
              Refresh Status
            </button>
            <button
              onClick={() => router.push("/clinician")}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-medium transition flex items-center gap-1.5"
            >
              <span>View Clinician Review</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE RELEASED SUMMARY
  const actions = (lang === "ar" ? data.actions_ar : data.actions_en) || [];
  const summaryText = lang === "ar" ? data.summary_ar : data.summary_en;
  const isEmergency = data.urgent_emergency;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Personal Health Dashboard
          </span>
          <span className="text-xs text-slate-500">
            Participant: <span className="font-semibold text-slate-900 dark:text-white capitalize">{activeUserId.replace("user_", "")}</span>
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Cognitive Vitality & Trajectory
        </h1>
      </div>

      {/* Primary Vitality Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Calibrated Within-Person Baseline</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {data.color === "green" && "Trajectory Stable & Within Reference"}
              {data.color === "yellow" && "Temporary Lifestyle Confounder Identified"}
              {data.color === "orange" && "Routine Primary Care Follow-up Recommended"}
              {data.color === "red" && "Immediate Clinical Assessment Recommended"}
              {data.color === "baseline" && "Establishing Reference Baseline"}
            </h2>
          </div>

          <div className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {data.confidence ? `${data.confidence.toUpperCase()} CONFIDENCE` : "HIGH ACCURACY"}
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {summaryText || "Your multi-domain check demonstrates consistency relative to your past sessions with no significant neurocognitive drift."}
        </p>

        {/* Clinician Released Note if present */}
        {data.clinician_note && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              Physician Sign-Off Note:
            </span>
            <p className="leading-relaxed font-normal">{data.clinician_note}</p>
          </div>
        )}
      </div>

      {/* Routine Lifestyle Action Steps */}
      {actions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Recommended Action Steps
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {actions.map((act, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs shadow-2xs"
              >
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center shrink-0 text-[11px]">
                  {idx + 1}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed pt-0.5">
                  {act}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Scheduled Check-In */}
      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Next Calibrated Session
          </h4>
          <p className="text-xs text-slate-500">
            Repeat check recommended in {data.repeat_days || 30} days to sustain trend accuracy.
          </p>
        </div>

        <button
          onClick={() => router.push("/check")}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-medium text-xs transition flex items-center gap-2 shadow-2xs shrink-0"
        >
          <span>Begin New Check</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
