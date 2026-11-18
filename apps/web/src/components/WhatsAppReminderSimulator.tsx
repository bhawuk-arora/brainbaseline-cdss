"use client";

import React, { useState } from "react";
import { MessageSquare, Smartphone, Check, Clock, Calendar, ArrowRight, X } from "lucide-react";

interface WhatsAppReminderSimulatorProps {
  userName: string;
  sessionCount: number;
  lang: string;
}

export const WhatsAppReminderSimulator: React.FC<WhatsAppReminderSimulatorProps> = ({
  userName,
  sessionCount,
  lang,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+971 50 123 4567");
  const [subscribed, setSubscribed] = useState(false);
  const [simulatedReceived, setSimulatedReceived] = useState(false);

  const neededSessions = Math.max(0, 4 - sessionCount);

  const reminderText = lang === "ar"
    ? `مرحباً ${userName}، حان موعد فحص حيوية الدماغ الشهري الخاص بك في BrainBaseline 🧠 (جلسة ${sessionCount + 1} من 4 لمعايرة خط الأساس). يستغرق 5 دقائق فقط عبر الرابط المباشر الآمن: https://brainbaseline.ae/check?u=token_984`
    : `Hi ${userName}! Your quick 5-minute BrainBaseline Vitality Check is ready 🧠 (Session ${sessionCount + 1} of 4 to calibrate your personal baseline). Tap your secure one-click link to start: https://brainbaseline.ae/check?u=token_984`;

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-3xl p-6 sm:p-7 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {lang === "ar" ? "نظام الالتزام الذكي وحفظ المشاركة" : "Zero-Dropoff Retention Engine"}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {lang === "ar"
              ? "تفعيل تذكيرات واتساب الشهرية الذكية بنقرة واحدة"
              : "WhatsApp / SMS Baseline Calibration Reminders"}
          </h3>
          <p className="text-xs text-slate-500 max-w-xl">
            {lang === "ar"
              ? `أكملت ${sessionCount} من أصل 4 جلسات مطلوبة. نرسل لك رابطاً سحرياً بدون كلمات مرور شهرياً لحماية دقة خط الأساس.`
              : `Completed ${sessionCount}/4 sessions. We send automated friction-free magic links to ensure you hit your 4-session calibration target.`}
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          <span>{lang === "ar" ? "معاينة التذكير التفاعلي" : "Preview WhatsApp Link"}</span>
        </button>
      </div>

      {/* Simulator Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">BrainBaseline UAE Concierge</h4>
                  <p className="text-[10px] text-emerald-100">WhatsApp Verified Healthcare Bot</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Simulator Canvas */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 min-h-[220px] space-y-3">
              <div className="text-center">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">
                  {lang === "ar" ? "اليوم • تشفير تام بين الطرفين" : "Today • End-to-End Encrypted"}
                </span>
              </div>

              {/* Bot Message Bubble */}
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none p-3.5 shadow-xs max-w-[90%] text-xs text-slate-800 dark:text-slate-100 leading-relaxed space-y-2">
                <p>{reminderText}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span>9:00 AM</span>
                  <span className="text-emerald-500 font-bold">✓✓ Delivered</span>
                </div>
              </div>

              {simulatedReceived && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>
                    {lang === "ar"
                      ? "تم تفعيل الاشتراك بالرقم! ستتلقى التنبيه التالي تلقائياً."
                      : "Subscribed! Next reminder scheduled 30 days post-baseline."}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="+971 50 xxx xxxx"
                />
                <button
                  onClick={() => {
                    setSubscribed(true);
                    setSimulatedReceived(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                >
                  {subscribed ? "Updated" : "Save Number"}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                HIPAA / UAE Health Data Law compliant. Zero spam. Opt out anytime by replying STOP.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
