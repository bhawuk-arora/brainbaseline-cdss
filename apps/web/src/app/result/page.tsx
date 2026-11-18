"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, ParticipantResultResponse, UserTrendResponse } from "@/lib/api";
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
  TrendingUp,
  Moon,
  Coffee,
  Eye,
  FileCheck2,
  HeartPulse,
  Send,
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
  const [trendData, setTrendData] = useState<UserTrendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Patient Pre-Review Context Intake State
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [sleepHours, setSleepHours] = useState(7.0);
  const [recentStress, setRecentStress] = useState(false);
  const [sensoryStrain, setSensoryStrain] = useState(false);
  const [newMed, setNewMed] = useState(false);
  const [patientNote, setPatientNote] = useState("");
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);
  const [submittingIntake, setSubmittingIntake] = useState(false);

  const loadResult = () => {
    setLoading(true);
    Promise.all([
      api.getUserResult(activeUserId).catch(() => null),
      api.getUserTrend(activeUserId).catch(() => null),
    ]).then(([res, trend]) => {
      setData(res);
      setTrendData(trend);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadResult();
  }, [activeUserId]);

  const handleSendContextIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIntake(true);
    try {
      await api.submitContextIntake({
        user_id: activeUserId,
        sleep_hours: sleepHours,
        mood_positive: !recentStress,
        illness: false,
        new_medication: newMed,
        pain: false,
        distraction: false,
        sensory_strain: sensoryStrain,
        recent_stress_event: recentStress,
        patient_notes: patientNote,
      });
      setIntakeSubmitted(true);
      setSubmittingIntake(false);
      loadResult();
    } catch (err) {
      console.error("Intake submission failed:", err);
      setSubmittingIntake(false);
    }
  };

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
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        {/* Attending Physician Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
                <Stethoscope className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Assigned Attending Clinician
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {data.attending_clinician_name || "Licensed Medical Specialist"}
                </h2>
                <p className="text-xs text-slate-500">
                  Cleveland Clinic Abu Dhabi / SEHA Health Network
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>Gate 5 Clinical Hold Active</span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {lang === "ar" ? "فحصك قيد التدقيق السريري الاحترافي" : "Your Session is Under Physician Review"}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {data.message_en ||
                "A licensed clinician is currently evaluating your session to rule out temporary reversible confounders (sleep restriction, recent viral illness, or sensory strain) before releasing your finalized routine plan."}
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowIntakeForm(!showIntakeForm)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition flex items-center gap-2 shadow-2xs"
            >
              <HeartPulse className="w-4 h-4" />
              <span>{showIntakeForm ? "Close Health Intake" : "Provide Daily Context to Doctor"}</span>
            </button>

            <button
              onClick={loadResult}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
            >
              Refresh Status
            </button>
          </div>
        </div>

        {/* Patient Context Self-Report Card (Answers the Clinical Confounder Problem) */}
        {showIntakeForm && (
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Moon className="w-4 h-4 text-teal-600" />
                  <span>1-Minute Pre-Review Health Intake</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Share temporary lifestyle context directly with your attending physician to assist in clinical evaluation.
                </p>
              </div>
            </div>

            {intakeSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Thank you! Your lifestyle context has been appended directly to {data.attending_clinician_name || "your clinician"}'s review workstation.
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendContextIntake} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hours of Sleep Last Night: <span className="text-teal-700 font-bold">{sleepHours} hrs</span>
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="0.5"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>3h (Deprived)</span>
                      <span>7-8h (Optimal)</span>
                      <span>12h</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Temporary Influences:
                    </label>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sensoryStrain}
                          onChange={(e) => setSensoryStrain(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        <span>Eye strain or hearing fatigue during check</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recentStress}
                          onChange={(e) => setRecentStress(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        <span>High acute stress or anxiety in past 24 hours</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newMed}
                          onChange={(e) => setNewMed(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        <span>Started a new prescription or cold medicine</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes for your attending doctor (optional):
                  </label>
                  <textarea
                    rows={2}
                    value={patientNote}
                    onChange={(e) => setPatientNote(e.target.value)}
                    placeholder="e.g. Worked late night shift; fasting for routine blood tests."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingIntake}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingIntake ? "Forwarding..." : "Submit to Physician Review Queue"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  // ACTIVE RELEASED SUMMARY
  const actions = (lang === "ar" ? data.actions_ar : data.actions_en) || [];
  const summaryText = lang === "ar" ? data.summary_ar : data.summary_en;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
            Personal Health Dashboard
          </span>
          <span className="text-xs text-slate-500">
            Participant: <span className="font-semibold text-slate-900 dark:text-white capitalize">{activeUserId.replace("user_", "")}</span>
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Cognitive Vitality & Trajectory
        </h1>
        <p className="text-xs text-slate-500">
          Supervised by: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.attending_clinician_name || "Licensed Medical Specialist"}</span>
        </p>
      </div>

      {/* Primary Vitality Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Calibrated Within-Person Baseline</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {data.color === "green" && "Trajectory Stable & Within Reference"}
              {data.color === "yellow" && "Temporary Lifestyle Confounder Identified"}
              {data.color === "orange" && "Routine Primary Care Follow-up Recommended"}
              {data.color === "red" && "Clinical Follow-up Assessment Scheduled"}
              {data.color === "baseline" && "Establishing Reference Baseline"}
            </h2>
          </div>

          <div className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {data.confidence ? `${data.confidence.toUpperCase()} CONFIDENCE` : "HIGH ACCURACY"}
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {summaryText || "Your multi-domain check demonstrates consistency relative to your past sessions with no significant neurocognitive drift."}
        </p>

        {/* Clinician Released Note if present */}
        {data.clinician_note && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Physician Sign-Off & Clinical Notes:</span>
            </span>
            <p className="leading-relaxed font-normal">{data.clinician_note}</p>
          </div>
        )}
      </div>

      {/* Longitudinal Trajectory Graph for Patient */}
      {trendData && trendData.sessions && trendData.sessions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>Your Longitudinal Vitality Progression</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tracked across {trendData.sessions.length} check-in sessions against your personal calibration band.
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Personalized Benchmark
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
            {trendData.sessions.map((sess) => {
              const memScore = sess.scores?.memory ?? 0;
              return (
                <div
                  key={sess.session_id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-center"
                >
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                    {sess.is_practice ? "Practice" : `Session ${sess.session_number}`}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white block">
                    {memScore > 0 ? `${memScore}%` : "—"}
                  </span>
                  <span
                    className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      sess.triage_color === "green"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : sess.triage_color === "yellow"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {sess.triage_color.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Routine Lifestyle Action Steps */}
      {actions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Recommended Action Steps
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {actions.map((act, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs shadow-2xs"
              >
                <span className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-teal-200 dark:border-teal-800">
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
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Next Calibrated Session
          </h4>
          <p className="text-xs text-slate-500">
            Repeat check recommended in {data.repeat_days || 30} days to sustain trend accuracy.
          </p>
        </div>

        <button
          onClick={() => router.push("/check")}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs transition flex items-center gap-2 shadow-2xs shrink-0"
        >
          <span>Begin New Check</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
