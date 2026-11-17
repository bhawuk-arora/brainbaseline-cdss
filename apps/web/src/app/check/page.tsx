"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, GateStep } from "@/lib/api";
import { WordMemoryTask } from "@/components/tasks/WordMemoryTask";
import { SequenceStudioTask } from "@/components/tasks/SequenceStudioTask";
import { GoNoGoTask } from "@/components/tasks/GoNoGoTask";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import {
  ShieldCheck,
  AlertTriangle,
  Moon,
  Brain,
  ClipboardList,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function CheckPage() {
  const { lang, activeUserId, t } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [sessionId, setSessionId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionTrace, setSubmissionTrace] = useState<GateStep[] | null>(null);

  // Step 1: Consent
  const [consentCognition, setConsentCognition] = useState<boolean>(true);
  const [consentMalaffi, setConsentMalaffi] = useState<boolean>(true);

  // Step 2: Red-Flags
  const [redFlags, setRedFlags] = useState({
    sudden_confusion: false,
    speech_trouble: false,
    new_weakness: false,
    recent_fall_head_injury: false,
  });

  // Step 3: Context
  const [contextData, setContextData] = useState({
    sleep_hours: 7.0,
    mood_positive: false,
    illness: false,
    new_medication: false,
  });

  // Step 4: Cognitive Task Scores
  const [taskIndex, setTaskIndex] = useState<number>(0);
  const [scores, setScores] = useState<Record<string, number>>({
    memory: 13.0,
    sequence_av: 11.5,
    attention_rt: 52.0,
  });
  const [subMetrics, setSubMetrics] = useState<Record<string, any>>({});

  // Step 5: Function Items (8 items, 0=no change, 1=little harder, 2=much harder)
  const [functionItems, setFunctionItems] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);

  const functionLabels = [
    { en: "Managing money, bills, or shopping change", ar: "إدارة الأموال أو الفواتير المنزلية أو حساب الباقي" },
    { en: "Repeating same questions or stories in one conversation", ar: "تكرار نفس الأسئلة أو القصص في المحادثة الواحدة" },
    { en: "Keeping track of day, date, or season", ar: "معرفة اليوم أو التاريخ أو الفصل الحالي" },
    { en: "Using a familiar phone, remote, or appliance", ar: "استخدام الهاتف أو جهاز التحكم أو الأجهزة المنزلية" },
    { en: "Finding your way in familiar neighborhoods or shops", ar: "معرفة الطريق في الأحياء أو المتاجر المألوفة" },
    { en: "Following a TV program, news story, or discussion", ar: "متابعة برنامج تلفزيوني أو نقاش جماعي" },
    { en: "Staying engaged in hobbies, reading, or social events", ar: "الاستمرار في الهوايات أو القراءة أو الأنشطة الاجتماعية" },
    { en: "Remembering appointments or medications without reminders", ar: "تذكر المواعيد أو الأدوية اليومية دون تذكير إضافي" },
  ];

  // Initialize session on mount
  useEffect(() => {
    api
      .initSession(activeUserId)
      .then((res) => setSessionId(res.session_id))
      .catch((e) => console.error("Init session failed:", e));
  }, [activeUserId]);

  const handleTask1Complete = (score: number, metrics: any) => {
    setScores((prev) => ({ ...prev, memory: score }));
    setSubMetrics((prev) => ({ ...prev, ...metrics }));
    setTaskIndex(1);
  };

  const handleTask2Complete = (score: number, metrics: any) => {
    setScores((prev) => ({ ...prev, sequence_av: score }));
    setSubMetrics((prev) => ({ ...prev, ...metrics }));
    setTaskIndex(2);
  };

  const handleTask3Complete = (score: number, metrics: any) => {
    setScores((prev) => ({ ...prev, attention_rt: score }));
    setSubMetrics((prev) => ({ ...prev, ...metrics }));
    setStep(5);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        user_id: activeUserId,
        scores,
        sub_metrics: subMetrics,
        context: contextData,
        red_flags: redFlags,
        function_items: functionItems,
      };

      const res = await api.submitSessionResults(sessionId, payload);
      setSubmissionTrace(res.agent_trace);
      setSubmitting(false);
    } catch (e) {
      console.error("Submission failed:", e);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step Indicator Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>{lang === "ar" ? `الخطوة ${step} من 5` : `Step ${step} of 5`}</span>
          <span className="text-sky-600 font-extrabold">
            {step === 1 && t("check.step_consent")}
            {step === 2 && t("check.step_red_flags")}
            {step === 3 && t("check.step_context")}
            {step === 4 && t("check.step_tasks")}
            {step === 5 && t("check.step_function")}
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-sky-600 h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Consent */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-100 dark:bg-sky-950 text-sky-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("check.consent_title")}
              </h2>
              <p className="text-xs text-slate-500">{t("check.consent_desc")}</p>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentCognition}
                onChange={(e) => setConsentCognition(e.target.checked)}
                className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
              />
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {t("check.consent_scope_cog")}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentMalaffi}
                onChange={(e) => setConsentMalaffi(e.target.checked)}
                className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
              />
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {t("check.consent_scope_malaffi")}
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!consentCognition}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>{t("check.consent_agree")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Red-Flag Emergency Screen */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("check.red_flags_title")}
              </h2>
              <p className="text-xs text-slate-500">{t("check.red_flags_desc")}</p>
            </div>
          </div>

          <div className="space-y-3 bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={redFlags.sudden_confusion}
                onChange={(e) =>
                  setRedFlags({ ...redFlags, sudden_confusion: e.target.checked })
                }
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="font-semibold text-rose-900 dark:text-rose-200">
                ⚠️ {t("check.rf_confusion")}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={redFlags.speech_trouble}
                onChange={(e) =>
                  setRedFlags({ ...redFlags, speech_trouble: e.target.checked })
                }
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="font-semibold text-rose-900 dark:text-rose-200">
                ⚠️ {t("check.rf_speech")}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={redFlags.new_weakness}
                onChange={(e) =>
                  setRedFlags({ ...redFlags, new_weakness: e.target.checked })
                }
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="font-semibold text-rose-900 dark:text-rose-200">
                ⚠️ {t("check.rf_weakness")}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={redFlags.recent_fall_head_injury}
                onChange={(e) =>
                  setRedFlags({ ...redFlags, recent_fall_head_injury: e.target.checked })
                }
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="font-semibold text-rose-900 dark:text-rose-200">
                ⚠️ {t("check.rf_fall")}
              </span>
            </label>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              {lang === "ar" ? "رجوع" : "Back"}
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>{lang === "ar" ? "متابعة الفحص" : "Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Context Check-in */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("check.context_title")}
              </h2>
              <p className="text-xs text-slate-500">{t("check.context_desc")}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Sleep Slider */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {t("check.ctx_sleep")}
                </span>
                <span className="text-sm font-black text-sky-600">
                  {contextData.sleep_hours} {lang === "ar" ? "ساعات" : "hours"}
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={contextData.sleep_hours}
                onChange={(e) =>
                  setContextData({ ...contextData, sleep_hours: parseFloat(e.target.value) })
                }
                className="w-full accent-sky-600"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contextData.mood_positive}
                  onChange={(e) =>
                    setContextData({ ...contextData, mood_positive: e.target.checked })
                  }
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {t("check.ctx_mood")}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contextData.illness}
                  onChange={(e) =>
                    setContextData({ ...contextData, illness: e.target.checked })
                  }
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {t("check.ctx_illness")}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contextData.new_medication}
                  onChange={(e) =>
                    setContextData({ ...contextData, new_medication: e.target.checked })
                  }
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {t("check.ctx_med")}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              {lang === "ar" ? "رجوع" : "Back"}
            </button>
            <button
              onClick={() => {
                setStep(4);
                setTaskIndex(0);
              }}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>{lang === "ar" ? "بدء الاختبارات الإدراكية" : "Start Cognitive Tasks"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Interactive Cognitive Tasks */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs font-bold mb-2">
            <span
              className={`px-3 py-1 rounded-full ${
                taskIndex === 0 ? "bg-sky-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              1. {lang === "ar" ? "الذاكرة" : "Word Memory"}
            </span>
            <span
              className={`px-3 py-1 rounded-full ${
                taskIndex === 1 ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              2. {lang === "ar" ? "استوديو التتابع" : "Sequence Studio"}
            </span>
            <span
              className={`px-3 py-1 rounded-full ${
                taskIndex === 2 ? "bg-amber-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              3. {lang === "ar" ? "الانتباه والسرعة" : "Go/No-Go Speed"}
            </span>
          </div>

          {taskIndex === 0 && <WordMemoryTask onComplete={handleTask1Complete} />}
          {taskIndex === 1 && <SequenceStudioTask onComplete={handleTask2Complete} />}
          {taskIndex === 2 && <GoNoGoTask onComplete={handleTask3Complete} />}
        </div>
      )}

      {/* STEP 5: 8-Item Daily Function Report */}
      {step === 5 && !submissionTrace && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("check.function_title")}
              </h2>
              <p className="text-xs text-slate-500">{t("check.function_desc")}</p>
            </div>
          </div>

          <div className="space-y-3">
            {functionLabels.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {idx + 1}. {item[lang]}
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { val: 0, en: "No change", ar: "لا تغيير" },
                    { val: 1, en: "A little harder", ar: "أصعب قليلاً" },
                    { val: 2, en: "Much harder", ar: "أصعب بكثير" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        const next = [...functionItems];
                        next[idx] = opt.val;
                        setFunctionItems(next);
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        functionItems[idx] === opt.val
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      {opt[lang]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              {lang === "ar" ? "رجوع" : "Back"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("check.submitting")}</span>
                </>
              ) : (
                <>
                  <span>{t("check.submit_check")}</span>
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Submission Result & Agent Trace */}
      {submissionTrace && (
        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
              {lang === "ar" ? "اكتمل تقييم الفحص بنجاح!" : "Assessment Processed Through 5-Gate Engine!"}
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
              {lang === "ar"
                ? "تم التحقق من كافة البوابات وتطبيق القواعد الرياضية الصارمة. يمكنك الآن استعراض أثر النتائج في خطتك الشخصية."
                : "All gates have been evaluated deterministically. You can now view your personalized health summary or clinical holding state."}
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push("/result")}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
              >
                <span>{lang === "ar" ? "عرض الخطة والتقرير" : "View My Plan"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AgentTracePanel trace={submissionTrace} />
        </div>
      )}
    </div>
  );
}
