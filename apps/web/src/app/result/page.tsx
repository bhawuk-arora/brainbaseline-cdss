"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, ParticipantResultResponse } from "@/lib/api";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Sparkles,
  Stethoscope,
  Shield,
  ArrowRight,
  Info,
} from "lucide-react";

export default function ResultPage() {
  const { lang, activeUserId, t } = useApp();
  const router = useRouter();

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
        console.error("Failed to fetch result:", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadResult();
  }, [activeUserId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 text-xs">
        {lang === "ar" ? "جارٍ تحميل ملخص الفحص..." : "Loading brain health summary..."}
      </div>
    );
  }

  if (!data) return null;

  // GATE 5 ACTIVE: Clinician Holding State
  if (data.status === "pending_clinician_review") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-spin" style={{ animationDuration: "12s" }} />
          </div>

          <span className="text-[11px] font-black tracking-wider uppercase px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 inline-block">
            {lang === "ar" ? "البوابة 5: حجب الطبيب مفعل" : "Gate 5: Clinician Hold Active"}
          </span>

          <h2 className="text-xl font-black text-amber-950 dark:text-amber-100">
            {t("result.pending_title")}
          </h2>

          <p className="text-xs sm:text-sm text-amber-900/80 dark:text-amber-200/80 max-w-lg mx-auto leading-relaxed">
            {lang === "ar" ? data.message_ar : data.message_en}
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={loadResult}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{lang === "ar" ? "التحقق من اعتماد الطبيب" : "Check for Clinician Release"}</span>
            </button>

            <button
              onClick={() => router.push("/clinician")}
              className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-xs shadow-xs hover:bg-amber-100/50 transition-all flex items-center gap-2"
            >
              <Stethoscope className="w-4 h-4 text-amber-600" />
              <span>{lang === "ar" ? "الانتقال إلى لوحة الطبيب للموافقة" : "Open Clinician Console to Release"}</span>
            </button>
          </div>
        </div>

        {data.agent_trace && data.agent_trace.length > 0 && (
          <AgentTracePanel trace={data.agent_trace} />
        )}
      </div>
    );
  }

  // RELEASED DIRECT OR CLINICIAN APPROVED
  const isEmergency = data.urgent_emergency;
  const color = data.color || "green";

  const getTriageBadge = (c: string) => {
    switch (c) {
      case "baseline":
        return {
          title: lang === "ar" ? "بناء خط الأساس الشخصي" : "Building Personal Baseline",
          bg: "bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200",
          icon: <Clock className="w-6 h-6 text-indigo-600" />,
        };
      case "green":
        return {
          title: t("result.stable_title"),
          bg: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200",
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
        };
      case "yellow":
        return {
          title: t("result.yellow_title"),
          bg: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200",
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
        };
      case "orange":
        return {
          title: t("result.orange_title"),
          bg: "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-200",
          icon: <AlertTriangle className="w-6 h-6 text-orange-600" />,
        };
      case "red":
        return {
          title: t("result.red_title"),
          bg: "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200",
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
        };
      default:
        return {
          title: "Complete",
          bg: "bg-slate-50 border-slate-200 text-slate-800",
          icon: <Info className="w-6 h-6 text-slate-600" />,
        };
    }
  };

  const badgeInfo = getTriageBadge(color);
  const actions = (lang === "ar" ? data.actions_ar : data.actions_en) || [];
  const summaryText = lang === "ar" ? data.summary_ar : data.summary_en;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Triage Banner */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-xs ${badgeInfo.bg} space-y-4`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white dark:bg-slate-900/80 rounded-2xl shadow-xs">
            {badgeInfo.icon}
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase block opacity-75">
              {lang === "ar" ? "حالة الفرز الطولي المعتمدة" : "Longitudinal Triage Status"}
            </span>
            <h2 className="text-xl font-black">{badgeInfo.title}</h2>
          </div>
        </div>

        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line opacity-95">
          {summaryText}
        </div>

        {/* Repeat interval */}
        {data.repeat_days !== undefined && data.repeat_days > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60 font-bold text-xs shadow-2xs">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>
              {t("result.repeat_text")} <strong className="text-sky-600 font-black">{data.repeat_days}</strong> {t("result.days")}
            </span>
          </div>
        )}
      </div>

      {/* Clinician Guidance Note (if available) */}
      {data.clinician_note && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs">
            <Stethoscope className="w-4 h-4" />
            <span>{t("clinician.clinician_note_label")}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 bg-sky-50 dark:bg-slate-800/80 p-3 rounded-xl border border-sky-100 dark:border-slate-700 font-medium leading-relaxed">
            "{data.clinician_note}"
          </p>
        </div>
      )}

      {/* 3 Tailored Lifestyle Actions */}
      {actions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("result.actions_title")}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {actions.map((act, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3 text-xs"
              >
                <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-black flex items-center justify-center shrink-0 text-xs">
                  {idx + 1}
                </span>
                <span className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {act}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Agent Trace */}
      {data.agent_trace && data.agent_trace.length > 0 && (
        <AgentTracePanel trace={data.agent_trace} />
      )}
    </div>
  );
}
