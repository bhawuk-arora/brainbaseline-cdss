"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/context";
import { Zap, Check, Play, Star, Circle } from "lucide-react";

interface GoNoGoTaskProps {
  onComplete: (
    score: number,
    metrics: { median_rt_ms: number; commission_errors: number; rt_iqr_ms: number }
  ) => void;
}

export const GoNoGoTask: React.FC<GoNoGoTaskProps> = ({ onComplete }) => {
  const { lang } = useApp();
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [stimulus, setStimulus] = useState<"go" | "nogo" | null>(null);
  const [trialCount, setTrialCount] = useState(0);
  const [demoSpeed, setDemoSpeed] = useState(true); // Default 10-trial fast mode for judge testing

  const maxTrials = demoSpeed ? 10 : 20;

  const reactionTimes = useRef<number[]>([]);
  const commissionErrors = useRef<number>(0);
  const stimulusShownTime = useRef<number>(0);
  const trialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWaitingForResponse = useRef<boolean>(false);

  const startTask = () => {
    reactionTimes.current = [];
    commissionErrors.current = 0;
    setTrialCount(0);
    setPhase("running");
    nextTrial(0);
  };

  const nextTrial = (currentCount: number) => {
    if (currentCount >= maxTrials) {
      finishTask();
      return;
    }

    setStimulus(null);
    isWaitingForResponse.current = false;

    // ISI jitter (400-800ms)
    const isi = demoSpeed ? 450 : Math.floor(Math.random() * 500) + 700;

    trialTimeoutRef.current = setTimeout(() => {
      // 75% Go (Star), 25% No-Go (Circle)
      const isGo = Math.random() < 0.75;
      const type = isGo ? "go" : "nogo";
      setStimulus(type);
      stimulusShownTime.current = performance.now();
      isWaitingForResponse.current = true;
      setTrialCount(currentCount + 1);

      // Stimulus presentation window (700ms)
      const windowTime = demoSpeed ? 600 : 800;
      trialTimeoutRef.current = setTimeout(() => {
        if (isWaitingForResponse.current && type === "go") {
          // Missed Go stimulus -> count default slow RT (650ms)
          reactionTimes.current.push(650);
        }
        isWaitingForResponse.current = false;
        nextTrial(currentCount + 1);
      }, windowTime);
    }, isi);
  };

  const handleTap = () => {
    if (phase !== "running" || !isWaitingForResponse.current) return;

    const rt = performance.now() - stimulusShownTime.current;
    isWaitingForResponse.current = false;

    if (stimulus === "go") {
      // Correct hit
      reactionTimes.current.push(Math.max(180, Math.round(rt)));
    } else if (stimulus === "nogo") {
      // Commission error (failure to inhibit)
      commissionErrors.current += 1;
    }

    setStimulus(null);
  };

  const finishTask = () => {
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current);
    setPhase("done");

    const rts = reactionTimes.current.length > 0 ? reactionTimes.current : [420];
    rts.sort((a, b) => a - b);

    const mid = Math.floor(rts.length / 2);
    const medianRt = rts.length % 2 !== 0 ? rts[mid] : (rts[mid - 1] + rts[mid]) / 2;

    const q1 = rts[Math.floor(rts.length * 0.25)] || medianRt;
    const q3 = rts[Math.floor(rts.length * 0.75)] || medianRt;
    const rtIqr = Math.max(10, q3 - q1);

    const comm = commissionErrors.current;

    // Attention composite formula:
    // clamp(100.0 - (median_rt_ms / 10.0) - (commission_errors * 4.0) - (rt_iqr_ms / 15.0), 0.0, 100.0)
    const composite = Math.max(
      0.0,
      Math.min(
        100.0,
        100.0 - medianRt / 10.0 - comm * 4.0 - rtIqr / 15.0
      )
    );

    onComplete(Number(composite.toFixed(1)), {
      median_rt_ms: Math.round(medianRt),
      commission_errors: comm,
      rt_iqr_ms: Math.round(rtIqr),
    });
  };

  useEffect(() => {
    return () => {
      if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === "ar"
                ? "مهمة الانتباه وسرعة الاستجابة (Go / No-Go)"
                : "Attention & Processing Speed (Go/No-Go)"}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === "ar" ? "قياس زمن رد الفعل والتحكم التثبيطي" : "Reaction time, RT-IQR variability & inhibition"}
            </p>
          </div>
        </div>

        {/* Demo Speed Toggle */}
        {phase === "intro" && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={demoSpeed}
              onChange={(e) => setDemoSpeed(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span className="font-semibold">{lang === "ar" ? "وضع العرض السريع" : "Demo Speed"}</span>
          </label>
        )}
      </div>

      {phase === "intro" && (
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Star className="w-10 h-10 fill-amber-400" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                ⭐ {lang === "ar" ? "نجمة = انقر فوراً!" : "Star = Tap Fast!"}
              </span>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-rose-500 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Circle className="w-10 h-10 stroke-[3]" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                ⭕ {lang === "ar" ? "دائرة = لا تنقر!" : "Circle = Hold Back!"}
              </span>
            </div>
          </div>

          <button
            onClick={startTask}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            {lang === "ar" ? "بدء اختبار الاستجابة" : "Start Reaction Task"}
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="py-8 text-center select-none">
          <div
            onClick={handleTap}
            className="w-48 h-48 mx-auto rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all shadow-inner bg-slate-50 dark:bg-slate-800/50"
          >
            {stimulus === "go" && (
              <div className="animate-in zoom-in-75 duration-75">
                <Star className="w-24 h-24 text-amber-400 fill-amber-400 drop-shadow-md" />
                <span className="text-xs font-black text-amber-600 block mt-2 uppercase tracking-widest">
                  {lang === "ar" ? "انقر الآن!" : "TAP NOW!"}
                </span>
              </div>
            )}

            {stimulus === "nogo" && (
              <div className="animate-in zoom-in-75 duration-75">
                <Circle className="w-24 h-24 text-rose-500 stroke-[3] drop-shadow-md" />
                <span className="text-xs font-black text-rose-600 block mt-2 uppercase tracking-widest">
                  {lang === "ar" ? "لا تنقر!" : "DON'T TAP!"}
                </span>
              </div>
            )}

            {!stimulus && (
              <span className="text-xs text-slate-400 font-semibold">
                {lang === "ar" ? "انتظر الرمز..." : "Ready..."}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-32 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-150"
                style={{ width: `${(trialCount / maxTrials) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {trialCount} / {maxTrials}
            </span>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {lang === "ar" ? "اكتمل اختبار الانتباه" : "Attention Task Completed"}
          </h4>
          <p className="text-xs text-slate-500">
            {lang === "ar" ? "تم احتساب مؤشر سرعة المعالجة والتحكم" : "Reaction composite & inhibition metrics saved"}
          </p>
        </div>
      )}
    </div>
  );
};
