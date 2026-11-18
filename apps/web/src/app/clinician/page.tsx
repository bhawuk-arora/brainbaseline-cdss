"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, ReviewQueueItem, UserTrendResponse } from "@/lib/api";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import { ClinicalNoteExportModal } from "@/components/ClinicalNoteExportModal";
import {
  Stethoscope,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingDown,
  ShieldAlert,
  Database,
  ArrowRight,
  FileCheck,
  CheckSquare,
  Square,
  FileText,
} from "lucide-react";

export default function ClinicianPage() {
  const { lang, activeUserId, activeRole, isAuthenticated, t } = useApp();
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication & Role Route Guard
  useEffect(() => {
    if (!isAuthenticated || activeRole !== "clinician") {
      router.push("/auth");
    }
  }, [isAuthenticated, activeRole, router]);

  // Decision state
  const [decision, setDecision] = useState<"approve" | "edit" | "escalate">("approve");
  const [note, setNote] = useState(
    "Reversible etiology evaluation ordered: serum B12 and thyroid panel. Formal audiology review scheduled before specialty escalation."
  );
  const [checkedCauses, setCheckedCauses] = useState<Set<string>>(new Set(["rc4", "rc5"]));
  const [referralDestination, setReferralDestination] = useState("SEHA Primary Care / Audiology Clinic");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const loadQueue = () => {
    setLoading(true);
    api
      .getReviewQueue()
      .then((items) => {
        setQueue(items);
        if (items.length > 0) {
          // Select item matching activeUserId if present, else first
          const matched = items.find((i) => i.user_id === activeUserId) || items[0];
          setSelectedItem(matched);
        } else {
          setSelectedItem(null);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load review queue:", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQueue();
  }, [activeUserId]);

  const toggleCause = (id: string) => {
    const next = new Set(checkedCauses);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedCauses(next);
  };

  const handleSimulateMalaffiImport = async () => {
    if (!selectedItem) return;
    try {
      await api.importFhir(
        selectedItem.user_id,
        ["hypertension", "hearing_loss", "sleep_apnea"],
        "malaffi_wearable"
      );
      loadQueue();
      alert(
        lang === "ar"
          ? "تم استيراد سجلات ملفي بنجاح وتحديث فئة الخطورة إلى معتدلة (3 نقاط)!"
          : "Simulated Malaffi / FHIR Wearable bundle imported! Risk profile updated to Moderate."
      );
    } catch (e) {
      console.error("Malaffi import failed:", e);
    }
  };

  const handleSimulateConsentRevoke = async () => {
    if (!selectedItem) return;
    try {
      await api.updateConsent(selectedItem.user_id, "cognition", false, "clinician_audit_test");
      alert(
        lang === "ar"
          ? "تم إلغاء موافقة المشارك بنجاح لاختبار البوابة 1 في سجل التدقيق!"
          : "Participant consent revoked live for Gate 1 test! Audit log entry generated."
      );
    } catch (e) {
      console.error("Consent revoke failed:", e);
    }
  };

  const handleSubmitDecision = async () => {
    if (!selectedItem) return;
    setSubmittingDecision(true);
    try {
      await api.submitReviewDecision(
        selectedItem.triage_id,
        decision,
        note,
        Array.from(checkedCauses),
        "dr_nour_neurology",
        referralDestination
      );
      setSubmittingDecision(false);
      setSuccessMessage(
        lang === "ar"
          ? "تم توقيع الخطة واعتمادها بنجاح! تم فك حجب التقرير وإرساله فوراً للمشارك."
          : "Plan approved & signed! Gate 5 hold released immediately to participant."
      );
      loadQueue();
    } catch (e) {
      console.error("Submit decision failed:", e);
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Clinician Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
              <Stethoscope className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Clinical Review Workstation
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              Gate 5 Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal">
            Evaluating flagged within-person baseline variances, reversible factors, and electronic health record disposition.
          </p>
        </div>

        <button
          onClick={loadQueue}
          className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-black">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          {lang === "ar" ? "جارٍ تحميل قائمة المراجعة..." : "Loading clinician review queue..."}
        </div>
      ) : queue.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {t("clinician.queue_empty")}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === "ar"
              ? "كافة الحالات المحجوبة تمت مراجعتها وإطلاقها بنجاح إلى المشاركين."
              : "All flagged cases have been evaluated and released."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pending Cases Queue */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === "ar"
                ? `قائمة الانتظار (${queue.length})`
                : `Pending Review Queue (${queue.length})`}
            </h3>

            {queue.map((item) => {
              const isSelected = selectedItem?.triage_id === item.triage_id;
              return (
                <div
                  key={item.triage_id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-400 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.user_name}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                      {item.triage_color}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>
                      {t("clinician.age")}: {item.age}
                    </span>
                    <span>•</span>
                    <span>
                      {lang === "ar" ? `جلسة ${item.session_number}` : `Session ${item.session_number}`}
                    </span>
                    <span>•</span>
                    <span>{item.language.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center & Right: Selected Patient Details & Trend Chart */}
          {selectedItem && (
            <div className="lg:col-span-2 space-y-6">
              {/* Patient Banner with Malaffi & Consent Test Buttons */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedItem.user_name} ({selectedItem.age}y, {selectedItem.language.toUpperCase()})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Triage ID: <code className="font-mono text-sky-600">{selectedItem.triage_id}</code>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSimulateMalaffiImport}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center gap-1.5 hover:bg-purple-100 transition-colors"
                      title="Ingests simulated Malaffi/FHIR wearable and risk profile"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{t("clinician.malaffi_btn")}</span>
                    </button>

                    <button
                      onClick={handleSimulateConsentRevoke}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1.5 hover:bg-rose-100 transition-colors"
                      title="Simulates immediate participant consent revocation"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{t("clinician.revoke_demo_btn")}</span>
                    </button>
                  </div>
                </div>

                {/* Integrated Health, Sleep & Genomic Risk Context Card */}
                {selectedItem.risk_profile && (
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-teal-600" />
                        Integrated Health & Genomic Context (DoH Abu Dhabi Model)
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 capitalize">
                        {selectedItem.risk_profile.tier} Risk Tier ({selectedItem.risk_profile.points} pts)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block">Repeat Testing</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Every {selectedItem.risk_profile.repeat_days} days
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block">Emirati Genome Tag</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedItem.risk_profile.factors.some((f) => f.category === "genetic") ? "APOE-ε4 / Family (+)" : "Standard Non-Carrier"}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block">Metabolic & Sleep</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedItem.risk_profile.factors.some((f) => f.id === "sleep_apnea" || f.id === "hypertension") ? "Vascular/Sleep Flag" : "Optimal"}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block">Active Indicators</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedItem.risk_profile.factors.length} Recorded
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flagged Reasons */}
                <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/80 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                  <span className="font-bold block">
                    {lang === "ar" ? "أسباب الفرز وتنبيهات المسار:" : "Gate 4 Triage Triggers:"}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {selectedItem.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Longitudinal Trend Chart (SVG) */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-sky-600" />
                    <span>{t("clinician.trend_chart_title")}</span>
                  </h4>

                  {/* Responsive SVG Chart */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <svg viewBox="0 0 500 160" className="w-full h-40">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#cbd5e1" strokeDasharray="3 3" />
                      <line x1="40" y1="80" x2="480" y2="80" stroke="#cbd5e1" strokeDasharray="3 3" />
                      <line x1="40" y1="140" x2="480" y2="140" stroke="#cbd5e1" strokeDasharray="3 3" />

                      {/* Shaded Personal Baseline Band (+- 1.5 SD) */}
                      <rect x="120" y="30" width="360" height="45" fill="#38bdf8" fillOpacity="0.15" />
                      <text x="40" y="24" fill="#94a3b8" fontSize="9">+1.5 SD</text>
                      <text x="40" y="55" fill="#0284c7" fontSize="9" fontWeight="bold">Baseline (Median)</text>
                      <text x="40" y="78" fill="#94a3b8" fontSize="9">-1.5 SD Band</text>

                      {/* Trajectory Polyline (Layla's Memory Trend) */}
                      <polyline
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        points="100,50 160,50 220,48 280,50 340,75 420,115"
                      />

                      {/* Session Dots */}
                      <circle cx="100" cy="50" r="4" fill="#94a3b8" />
                      <text x="92" y="152" fill="#64748b" fontSize="9">S1 (Prac)</text>

                      <circle cx="160" cy="50" r="4.5" fill="#16a34a" />
                      <text x="150" y="152" fill="#64748b" fontSize="9">S2 (Base)</text>

                      <circle cx="220" cy="48" r="4.5" fill="#16a34a" />
                      <text x="210" y="152" fill="#64748b" fontSize="9">S3 (Base)</text>

                      <circle cx="280" cy="50" r="4.5" fill="#16a34a" />
                      <text x="270" y="152" fill="#64748b" fontSize="9">S4 (Base)</text>

                      <circle cx="340" cy="75" r="5" fill="#eab308" />
                      <text x="330" y="152" fill="#64748b" fontSize="9">S5 (Dip)</text>

                      {/* Session 6 Dropped Below Band */}
                      <circle cx="420" cy="115" r="6" fill="#ea580c" stroke="#ffedd5" strokeWidth="2" />
                      <text x="400" y="152" fill="#ea580c" fontWeight="bold" fontSize="9">S6 (Decline)</text>
                    </svg>

                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                      {lang === "ar"
                        ? "النطاق المظلل يمثل خط الأساس الفردي (±1.5 انحراف معياري). الجلسة 6 تظهر انحرافاً حقيقياً خارج النطاق مع تنبيه الانجراف CUSUM."
                        : "Shaded blue region denotes within-person baseline band (±1.5 SD). Session 6 clearly falls outside individual tolerance with cumulative CUSUM drift alarm."}
                    </p>
                  </div>
                </div>

                {/* Interactive Reversible-Cause Checklist */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t("clinician.reversible_title")}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedItem.reversible_causes.map((rc) => {
                      const isChecked = checkedCauses.has(rc.id);
                      return (
                        <div
                          key={rc.id}
                          onClick={() => toggleCause(rc.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                            isChecked
                              ? "bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-950 dark:text-sky-200"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <span className="font-medium leading-relaxed">{rc[lang]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Clinical Release Form */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {t("clinician.decision_title")}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { val: "approve", label: t("clinician.decision_approve") },
                      { val: "edit", label: "Edit Lifestyle Plan" },
                      { val: "escalate", label: t("clinician.decision_refer") },
                    ].map((d) => (
                      <button
                        key={d.val}
                        onClick={() => setDecision(d.val as any)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                          decision === d.val
                            ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {/* Referral Destination */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {lang === "ar" ? "وجهة الإحالة السريرية في الإمارات:" : "UAE Referral Routing:"}
                    </label>
                    <select
                      value={referralDestination}
                      onChange={(e) => setReferralDestination(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="SEHA Primary Care / Audiology Clinic">
                        SEHA Primary Care & Audiology Workup (Abu Dhabi)
                      </option>
                      <option value="Cleveland Clinic Abu Dhabi (Neurology / Memory Clinic)">
                        Cleveland Clinic Abu Dhabi — Cognitive Neurology Clinic
                      </option>
                      <option value="Sheikh Shakhbout Medical City (SSMC) Geriatrics">
                        Sheikh Shakhbout Medical City (SSMC) — Geriatric Medicine
                      </option>
                      <option value="Community Mental Health / Sleep Medicine Center">
                        Community Mental Health & Sleep Disorder Clinic
                      </option>
                    </select>
                  </div>

                  {/* Clinician Note */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {t("clinician.clinician_note_label")}
                    </label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl border border-sky-300 dark:border-sky-850 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold text-xs transition flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span>{lang === "ar" ? "تصدير مذكرة EHR السريرية (CPT 96138)" : "1-Click EHR Note Export (CPT 96138)"}</span>
                    </button>

                    <button
                      onClick={handleSubmitDecision}
                      disabled={submittingDecision}
                      className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>{t("clinician.release_btn")}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent Trace */}
              <AgentTracePanel trace={selectedItem.agent_trace} />

              {/* 1-Click EHR Export Modal */}
              <ClinicalNoteExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                item={selectedItem}
                decision={decision}
                note={note}
                checkedCauses={Array.from(checkedCauses)}
                referralDestination={referralDestination}
                lang={lang}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
