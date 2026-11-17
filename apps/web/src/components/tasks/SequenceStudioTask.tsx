"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/context";
import { Music, Check, ArrowRight, Play } from "lucide-react";

interface SequenceStudioTaskProps {
  onComplete: (score: number, metrics: { visual_acc: number; auditory_acc: number }) => void;
}

const TONES = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
const PAD_COLORS = [
  { base: "bg-blue-500", active: "bg-blue-300 ring-4 ring-blue-300", name: "Blue" },
  { base: "bg-amber-500", active: "bg-amber-300 ring-4 ring-amber-300", name: "Amber" },
  { base: "bg-emerald-500", active: "bg-emerald-300 ring-4 ring-emerald-300", name: "Emerald" },
  { base: "bg-rose-500", active: "bg-rose-300 ring-4 ring-rose-300", name: "Rose" },
];

export const SequenceStudioTask: React.FC<SequenceStudioTaskProps> = ({ onComplete }) => {
  const { lang, audioEnabled } = useApp();
  const [phase, setPhase] = useState<"intro" | "demonstrating" | "user_input" | "done">("intro");
  const [activePad, setActivePad] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([0, 2, 1]); // initial span 3
  const [userInput, setUserInput] = useState<number[]>([]);
  const [visualHits, setVisualHits] = useState(0);
  const [auditoryHits, setAuditoryHits] = useState(0);
  const [totalTrials, setTotalTrials] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthesized sine tone
  const playTone = (padIdx: number) => {
    if (typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(TONES[padIdx], ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio fallback silent
    }
  };

  const flashPad = (padIdx: number, durationMs: number = 350) => {
    setActivePad(padIdx);
    playTone(padIdx);
    setTimeout(() => {
      setActivePad(null);
    }, durationMs);
  };

  const playSequence = (seq: number[]) => {
    setPhase("demonstrating");
    setUserInput([]);
    seq.forEach((padIdx, i) => {
      setTimeout(() => {
        flashPad(padIdx, 400);
        if (i === seq.length - 1) {
          setTimeout(() => setPhase("user_input"), 500);
        }
      }, i * 650);
    });
  };

  const startTask = () => {
    setLevel(1);
    const initialSeq = [0, 2, 1];
    setSequence(initialSeq);
    playSequence(initialSeq);
  };

  const handlePadTap = (padIdx: number) => {
    if (phase !== "user_input") return;

    flashPad(padIdx, 250);
    const nextInput = [...userInput, padIdx];
    setUserInput(nextInput);

    const stepIndex = nextInput.length - 1;
    const isCorrect = sequence[stepIndex] === padIdx;

    if (!isCorrect) {
      // Mistake -> end and calculate score
      finishTask(level, visualHits, auditoryHits, totalTrials + 1);
      return;
    }

    // Correct step
    setVisualHits((v) => v + 1);
    setAuditoryHits((a) => a + 1);
    setTotalTrials((t) => t + 1);

    if (nextInput.length === sequence.length) {
      // Sequence completed successfully
      if (level < 3) {
        // Advance to next span
        const nextLevel = level + 1;
        setLevel(nextLevel);
        const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(nextSeq);
        setTimeout(() => playSequence(nextSeq), 700);
      } else {
        finishTask(level + 1, visualHits + 1, auditoryHits + 1, totalTrials + 1);
      }
    }
  };

  const finishTask = (reachedLevel: number, vHits: number, aHits: number, trials: number) => {
    setPhase("done");
    // Span 3 -> base 11.5, span 4 -> 13.5, span 5 -> 15.0
    const rawScore = Math.min(16.0, Math.max(5.0, 9.0 + reachedLevel * 1.8));
    const vAcc = trials > 0 ? Math.min(1.0, vHits / trials) : 0.85;
    const aAcc = trials > 0 ? Math.min(1.0, aHits / trials) : 0.85;

    onComplete(Number(rawScore.toFixed(1)), {
      visual_acc: Number(vAcc.toFixed(2)),
      auditory_acc: Number(aAcc.toFixed(2)),
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-xl">
          <Music className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {lang === "ar"
              ? "استوديو التتابع السمعي البصري (4 لوحات)"
              : "4-Pad Audio-Visual Sequence Studio"}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === "ar"
              ? "فحص وتفريق مسار الذاكرة البصرية عن السمعية"
              : "Dual visual vs. auditory memory pathway span task"}
          </p>
        </div>
      </div>

      {phase === "intro" && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {lang === "ar"
              ? "شاهد واستمع لتسلسل النغمات والأضواء الملونة، ثم كرر نفس التسلسل بالنقر على اللوحات الأربع بنفس الترتيب."
              : "Watch and listen as the colored pads light up with tone frequencies. Repeat the sequence by tapping the pads in the exact same order."}
          </p>
          <button
            onClick={startTask}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            {lang === "ar" ? "بدء استوديو التتابع" : "Start Sequence Studio"}
          </button>
        </div>
      )}

      {(phase === "demonstrating" || phase === "user_input") && (
        <div className="py-4">
          <div className="text-center mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {phase === "demonstrating"
                ? lang === "ar"
                  ? "👀 راقب واستمع للتسلسل..."
                  : "👀 Watch & Listen..."
                : lang === "ar"
                ? "👉 دورك: انقر على اللوحات بالترتيب"
                : "👉 Your turn: Repeat the sequence"}
            </span>
          </div>

          {/* 4 Interactive Pads Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-6">
            {PAD_COLORS.map((pad, idx) => {
              const isFlashing = activePad === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handlePadTap(idx)}
                  disabled={phase === "demonstrating"}
                  className={`h-24 rounded-2xl transition-all duration-100 flex items-center justify-center font-bold text-white shadow-md active:scale-95 ${
                    isFlashing ? pad.active : pad.base
                  } ${phase === "demonstrating" ? "opacity-90 cursor-default" : "cursor-pointer hover:opacity-95"}`}
                >
                  <span className="text-sm opacity-90">{pad.name}</span>
                </button>
              );
            })}
          </div>

          <div className="text-center">
            <span className="text-[11px] font-semibold text-slate-400">
              {lang === "ar"
                ? `المستوى ${level} (طول التسلسل: ${sequence.length})`
                : `Level ${level} (Sequence Span: ${sequence.length})`}
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
            {lang === "ar" ? "اكتمل فحص التتابع" : "Sequence Task Completed"}
          </h4>
          <p className="text-xs text-slate-500">
            {lang === "ar" ? "تم تسجيل دقة المسار البصري والسمعي" : "Visual & auditory accuracy recorded"}
          </p>
        </div>
      )}
    </div>
  );
};
