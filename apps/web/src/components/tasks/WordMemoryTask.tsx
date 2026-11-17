"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { Volume2, Check, ArrowRight, Brain } from "lucide-react";

interface WordItem {
  id: string;
  en: string;
  ar: string;
}

const FORM_A_WORDS = {
  targets: [
    { id: "w1", en: "Bridge", ar: "جسر" },
    { id: "w2", en: "Lantern", ar: "فانوس" },
    { id: "w3", en: "Olive", ar: "زيتون" },
    { id: "w4", en: "Compass", ar: "بوصلة" },
    { id: "w5", en: "Harbor", ar: "ميناء" },
    { id: "w6", en: "Feather", ar: "ريشة" },
    { id: "w7", en: "Kettle", ar: "إبريق" },
    { id: "w8", en: "Garden", ar: "حديقة" },
  ],
  distractors: [
    { id: "d1", en: "Window", ar: "نافذة" },
    { id: "d2", en: "Anchor", ar: "مرساة" },
    { id: "d3", en: "Pebble", ar: "حصاة" },
    { id: "d4", en: "Basket", ar: "سلة" },
    { id: "d5", en: "Mirror", ar: "مرآة" },
    { id: "d6", en: "Candle", ar: "شمعة" },
    { id: "d7", en: "Desert", ar: "صحراء" },
    { id: "d8", en: "Needle", ar: "إبرة" },
  ],
};

interface WordMemoryTaskProps {
  onComplete: (score: number, metrics: { hits: number; false_alarms: number }) => void;
}

export const WordMemoryTask: React.FC<WordMemoryTaskProps> = ({ onComplete }) => {
  const { lang, audioEnabled } = useApp();
  const [phase, setPhase] = useState<"intro" | "study" | "recognition" | "done">("intro");
  const [studyIndex, setStudyIndex] = useState(0);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [shuffledPool, setShuffledPool] = useState<WordItem[]>([]);

  // Speak word using Web Speech API if enabled
  const speakWord = (text: string) => {
    if (audioEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "ar" ? "ar-SA" : "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startStudy = () => {
    setPhase("study");
    setStudyIndex(0);
    speakWord(FORM_A_WORDS.targets[0][lang]);
  };

  // Study phase: word presentation loop
  useEffect(() => {
    if (phase !== "study") return;

    const timer = setTimeout(() => {
      if (studyIndex < FORM_A_WORDS.targets.length - 1) {
        const nextIdx = studyIndex + 1;
        setStudyIndex(nextIdx);
        speakWord(FORM_A_WORDS.targets[nextIdx][lang]);
      } else {
        // Transition to recognition grid
        const allWords = [...FORM_A_WORDS.targets, ...FORM_A_WORDS.distractors].sort(
          () => Math.random() - 0.5
        );
        setShuffledPool(allWords);
        setPhase("recognition");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, studyIndex, lang]);

  const toggleSelectWord = (id: string) => {
    const next = new Set(selectedWordIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWordIds(next);
  };

  const finishRecognition = () => {
    const targetIds = new Set(FORM_A_WORDS.targets.map((w) => w.id));
    let hits = 0;
    let false_alarms = 0;

    selectedWordIds.forEach((id) => {
      if (targetIds.has(id)) hits += 1;
      else false_alarms += 1;
    });

    const net = hits - false_alarms;
    const finalScore = Math.max(0.0, Math.min(16.0, net + 8.0));
    setPhase("done");
    onComplete(finalScore, { hits, false_alarms });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="p-2 bg-sky-100 dark:bg-sky-950 text-sky-600 rounded-xl">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {lang === "ar" ? "مهمة استرجاع الكلمات (الذاكرة اللفظية)" : "Word Memory & Recognition Task"}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === "ar" ? "تقييم سعة التخزين والتعرف (نموذج أ)" : "Target recognition net score (Form A)"}
          </p>
        </div>
      </div>

      {phase === "intro" && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {lang === "ar"
              ? "ستظهر لك 8 كلمات، كلمة واحدة في كل مرة. اقرأها بتركيز وتذكرها جيداً. بعدها ستختار الكلمات التي رأيتها من شبكة الكلمات."
              : "You will see 8 words, presented one by one. Read and remember them carefully. Afterwards, select the words you saw from a list."}
          </p>
          <button
            onClick={startStudy}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
          >
            {lang === "ar" ? "بدء استعراض الكلمات" : "Start Word Presentation"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {phase === "study" && (
        <div className="text-center py-12">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">
            {lang === "ar" ? `الكلمة ${studyIndex + 1} من 8` : `Word ${studyIndex + 1} of 8`}
          </span>
          <div className="text-4xl font-black text-sky-600 dark:text-sky-400 tracking-wide mb-6 animate-pulse">
            {FORM_A_WORDS.targets[studyIndex][lang]}
          </div>
          <div className="w-48 mx-auto bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-sky-600 h-full transition-all duration-300"
              style={{ width: `${((studyIndex + 1) / 8) * 100}%` }}
            />
          </div>
        </div>
      )}

      {phase === "recognition" && (
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 text-center font-medium">
            {lang === "ar"
              ? "انقر على الكلمات التي ظهرت لك في القائمة السابقة (اختر ما تتذكره):"
              : "Tap only the words that appeared in the study list earlier:"}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {shuffledPool.map((word) => {
              const isSelected = selectedWordIds.has(word.id);
              return (
                <button
                  key={word.id}
                  onClick={() => toggleSelectWord(word.id)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-400"
                  }`}
                >
                  <span>{word[lang]}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              {lang === "ar"
                ? `تم اختيار ${selectedWordIds.size} كلمة`
                : `${selectedWordIds.size} words selected`}
            </span>
            <button
              onClick={finishRecognition}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all"
            >
              {lang === "ar" ? "تأكيد واستمرار" : "Confirm & Continue"}
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {lang === "ar" ? "اكتملت مهمة الذاكرة" : "Word Memory Task Completed"}
          </h4>
          <p className="text-xs text-slate-500">
            {lang === "ar" ? "تم تسجيل النتيجة بنجاح" : "Score recorded successfully"}
          </p>
        </div>
      )}
    </div>
  );
};
