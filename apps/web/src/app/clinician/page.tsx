"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, ReviewQueueItem, UserTrendResponse, ClinicianSummary } from "@/lib/api";
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
  UserCheck,
  Users,
  Moon,
  Clock,
  ArrowRightLeft,
  ChevronRight,
} from "lucide-react";

export default function ClinicianPage() {
  const { lang, activeUserId, activeRole, isAuthenticated, t } = useApp();
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [clinicians, setClinicians] = useState<ClinicianSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter queue by clinician
  const [filterMode, setFilterMode] = useState<"all" | "my">("my");
  const [reassigningClinicianId, setReassigningClinicianId] = useState<string>("");

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

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getReviewQueue().catch(() => []),
      api.getClinicians().catch(() => []),
    ]).then(([items, clins]) => {
      setQueue(items);
      setClinicians(clins);
      if (items.length > 0) {
        // Select matching item if available
        const matched =
          items.find((i) => i.attending_clinician_id === activeUserId) || items[0];
        setSelectedItem(matched);
      } else {
        setSelectedItem(null);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
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
      loadData();
      alert(
        lang === "ar"
          ? "تم استيراد سجلات ملفي بنجاح وتحديث فئة الخطورة إلى معتدلة (3 نقاط)!"
          : "Simulated Malaffi / FHIR Wearable bundle imported! Risk profile updated to Moderate."
      );
    } catch (e) {
      console.error("Malaffi import failed:", e);
    }
  };

  const handleReassignClinician = async (targetClinicianId: string) => {
    if (!selectedItem || !targetClinicianId) return;
    try {
      const res = await api.assignClinician(targetClinicianId, selectedItem.user_id);
      setSuccessMessage(res.message);
      loadData();
    } catch (e: any) {
      console.error("Reassign failed:", e);
      alert("Failed to reassign clinician: " + e.message);
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
        activeUserId || "dr_nour",
        referralDestination
      );
      setSubmittingDecision(false);
      setSuccessMessage(
        lang === "ar"
          ? "تم توقيع الخطة واعتمادها بنجاح! تم فك حجب التقرير وإرساله فوراً للمشارك."
          : "Plan approved & signed! Gate 5 hold released immediately to participant."
      );
      loadData();
    } catch (e) {
      console.error("Submit decision failed:", e);
      setSubmittingDecision(false);
    }
  };

  // Filtered queue based on clinician assignment tab
  const displayedQueue = queue.filter((item) => {
    if (filterMode === "my") {
      return item.attending_clinician_id === activeUserId;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Top Header & Workload Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Clinical Review Workstation
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              Gate 5 Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal">
            Evaluating flagged baseline variances, patient-reported confounders, and Malaffi EHR disposition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* My Cases vs All Facility Cases Tab */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterMode("my")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === "my"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              My Attended Patients ({queue.filter((q) => q.attending_clinician_id === activeUserId).length})
            </button>
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Facility Queue ({queue.length})
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5 transition"
            title="Refresh Queue"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-black">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          Loading clinical review queue...
        </div>
      ) : displayedQueue.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {filterMode === "my" ? "No Pending Patients Under Your Direct Care" : "Review Queue Clear"}
          </h3>
          <p className="text-xs text-slate-500">
            {filterMode === "my"
              ? "Switch to 'All Facility Queue' to view unassigned or peer patients."
              : "All flagged cases have been evaluated and released."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Pending Cases Queue */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Patients Pending Sign-Off ({displayedQueue.length})
              </h3>
            </div>

            <div className="space-y-2">
              {displayedQueue.map((item) => {
                const isSelected = selectedItem?.triage_id === item.triage_id;
                const isAssignedToMe = item.attending_clinician_id === activeUserId;
                return (
                  <div
                    key={item.triage_id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 shadow-2xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.user_name}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        {item.triage_color}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mb-2">
                      <span>Age: {item.age}</span>
                      <span>•</span>
                      <span>Session {item.session_number}</span>
                      <span>•</span>
                      <span>{item.language.toUpperCase()}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-teal-600" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.attending_clinician_name || "Unassigned"}
                        </span>
                      </span>
                      {isAssignedToMe && (
                        <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold">
                          My Patient
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center & Right: Selected Patient Details & Trend Chart */}
          {selectedItem && (
            <div className="lg:col-span-8 space-y-6">
              {/* Patient Banner with Clinician Reassignment & Malaffi */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedItem.user_name} ({selectedItem.age}y, {selectedItem.language.toUpperCase()})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Triage Reference: <code className="font-mono text-teal-600">{selectedItem.triage_id}</code>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Reassign Attending Clinician Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500 font-medium text-[11px]">Attending:</span>
                      <select
                        value={selectedItem.attending_clinician_id || ""}
                        onChange={(e) => handleReassignClinician(e.target.value)}
                        className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 outline-none text-xs"
                      >
                        <option value="" disabled>Select Clinician</option>
                        {clinicians.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.department || c.specialty})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleSimulateMalaffiImport}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center gap-1.5 hover:bg-purple-100 transition"
                      title="Ingests simulated Malaffi/FHIR wearable and risk profile"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Import Malaffi EHR</span>
                    </button>
                  </div>
                </div>

                {/* Patient-Reported Pre-Review Health Intake (Live Context) */}
                {selectedItem.context_intake && (
                  <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900 text-xs space-y-2">
                    <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-amber-700" />
                      <span>Patient Self-Reported Session Context (Rule-Out Clues):</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-white/80 dark:bg-slate-900 rounded-lg">
                        <span className="text-slate-400 block">Sleep Prior Night</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedItem.context_intake.sleep_hours} Hours
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 dark:bg-slate-900 rounded-lg">
                        <span className="text-slate-400 block">Sensory Strain</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedItem.context_intake.red_flags?.sensory_strain ? "Reported (+)" : "None"}
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 dark:bg-slate-900 rounded-lg">
                        <span className="text-slate-400 block">Recent Stress Event</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedItem.context_intake.red_flags?.recent_stress_event ? "High Acute Stress" : "Normal"}
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 dark:bg-slate-900 rounded-lg">
                        <span className="text-slate-400 block">Medication Changes</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedItem.context_intake.new_medication ? "New Meds Started" : "Stable"}
                        </span>
                      </div>
                    </div>
                    {selectedItem.context_intake.red_flags?.patient_notes && (
                      <p className="text-[11px] text-amber-900 dark:text-amber-300 italic pt-1">
                        "{selectedItem.context_intake.red_flags.patient_notes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Integrated Health & Genomic Context Card */}
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
                  <span className="font-bold block">Gate 4 Statistical Drift Triggers:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {selectedItem.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Interactive Reversible-Cause Clearance Checklist */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Reversible Factor Medical Workup Checklist:
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
                              ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-200"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
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
                    Clinical Disposition & Plan Sign-Off:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { val: "approve", label: "Clear & Approve Routine Plan" },
                      { val: "edit", label: "Edit Lifestyle Plan" },
                      { val: "escalate", label: "Specialty Escalation / Referral" },
                    ].map((d) => (
                      <button
                        key={d.val}
                        onClick={() => setDecision(d.val as any)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                          decision === d.val
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs"
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
                      UAE Referral Routing:
                    </label>
                    <select
                      value={referralDestination}
                      onChange={(e) => setReferralDestination(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-teal-500"
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
                      Physician Notes for Participant (Non-Alarmist Summary):
                    </label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl border border-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold text-xs transition flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>1-Click EHR Note Export (CPT 96138)</span>
                    </button>

                    <button
                      onClick={handleSubmitDecision}
                      disabled={submittingDecision}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>{submittingDecision ? "Signing..." : "Sign Off & Release Plan to Patient"}</span>
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
