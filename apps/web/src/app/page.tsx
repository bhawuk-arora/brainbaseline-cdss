"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import {
  Brain,
  ShieldCheck,
  Activity,
  ArrowRight,
  Stethoscope,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

export default function HomePage() {
  const { lang, setActiveUserId, setActiveRole, t } = useApp();
  const router = useRouter();

  const handleLaunchPersona = (userId: string, targetRoute: string, role: "participant" | "clinician") => {
    setActiveUserId(userId);
    setActiveRole(role);
    router.push(targetRoute);
  };

  const personas = [
    {
      id: "user_layla",
      name: "Layla Al-Mansoori (68F)",
      badge: "Orange Held Queue",
      badgeColor: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
      desc_en: "Persistent decline in memory & sequence over 6 sessions + functional change. Held in Clinician Queue (Gate 5) for reversible-cause review before participant disclosure.",
      desc_ar: "تراجع مستمر في الذاكرة والتتابع على مدى 6 جلسات مع تغير وظيفي. محجوبة في قائمة الطبيب (البوابة 5) لمراجعة الأسباب القابلة للعلاج قبل الإفصاح.",
      cta_text: lang === "ar" ? "مراجعة الحالة في لوحة الطبيب" : "Open in Clinician Console",
      target: "/clinician",
      role: "clinician" as const,
    },
    {
      id: "user_tariq",
      name: "Tariq Al-Nuaimi (58M)",
      badge: "Yellow Sleep Dip (3.5h)",
      badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
      desc_en: "Acute sleep disruption (3.5h) causing temporary domain dip. Gate 3 correctly routes to Yellow (repeat in 10 days) without triggering premature alarms.",
      desc_ar: "اضطراب حاد في النوم (3.5 ساعة) تسبب في تراجع مؤقت. البوابة 3 توجهه إلى اللون الأصفر (إعادة بعد 10 أيام) دون إنذار خاطئ.",
      cta_text: lang === "ar" ? "عرض الخطة الشخصية" : "View Participant Plan",
      target: "/result",
      role: "participant" as const,
    },
    {
      id: "user_fatima",
      name: "Fatima Al-Ali (72F)",
      badge: "Green Stable (Low-Edu Fairness)",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
      desc_en: "Limited formal schooling. Traditional population norms falsely fail her, but BrainBaseline's within-person shrinkage baseline proves perfect stability (z ≈ 0.0).",
      desc_ar: "تعليم رسمي محدود. المعايير السكانية القديمة تصنفها خطأ، بينما يثبت خط الأساس الشخصي في BrainBaseline استقرارها الكامل.",
      cta_text: lang === "ar" ? "عرض المسار الطولي" : "View Stable Trajectory",
      target: "/result",
      role: "participant" as const,
    },
    {
      id: "user_omar",
      name: "Omar Al-Husseini (64M)",
      badge: "Red 100% Emergency Gate",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
      desc_en: "Reported sudden confusion and speech trouble today. Gate 2 immediately bypasses cognitive scoring and routes to emergency 999 care.",
      desc_ar: "أبلغ عن تشوش مفاجئ وصعوبة في النطق اليوم. البوابة 2 تتجاوز الفحص الإدراكي فوراً وتوجه لطلب طوارئ 999.",
      cta_text: lang === "ar" ? "عرض توجيهات الطوارئ" : "View Emergency Advice",
      target: "/result",
      role: "participant" as const,
    },
    {
      id: "user_sara",
      name: "Sara Al-Zaabi (49F)",
      badge: "Building Baseline (2/4)",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
      desc_en: "Completed 2 check-ins. Triage state is 'baseline'; prompt informs participant that 2 more sessions are needed to establish reference calibration.",
      desc_ar: "أكملت فحصين. الحالة في وضع 'بناء خط الأساس' لإعلامها بالحاجة إلى فحصين إضافيين لتثبيت المرجع الشخصي.",
      cta_text: lang === "ar" ? "إكمال جلسة خط الأساس" : "Continue Baseline Check",
      target: "/check",
      role: "participant" as const,
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            DoH Abu Dhabi × Inception 42 Cognitive AI Benchmark Winner
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {t("home.hero_title")}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            {t("home.hero_desc")}
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => router.push("/check")}
              className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <Activity className="w-4 h-4" />
              {t("home.start_cta")}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setActiveRole("clinician");
                router.push("/clinician");
              }}
              className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-sm border border-slate-700 transition-all flex items-center gap-2"
            >
              <Stethoscope className="w-4 h-4 text-sky-400" />
              {t("home.clinician_cta")}
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 3 Winning Clinical Pillars */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-600" />
          {t("home.pillars_title")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:border-sky-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {t("home.pillar_1_title")}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t("home.pillar_1_desc")}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:border-sky-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {t("home.pillar_2_title")}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t("home.pillar_2_desc")}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:border-sky-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {t("home.pillar_3_title")}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t("home.pillar_3_desc")}
            </p>
          </div>
        </div>
      </section>

      {/* 1-Click Interactive Persona Launchpad */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {t("home.launchpad_title")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("home.launchpad_subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {personas.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {lang === "ar" ? p.desc_ar : p.desc_en}
                </p>
              </div>

              <button
                onClick={() => handleLaunchPersona(p.id, p.target, p.role)}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <span>{p.cta_text}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
