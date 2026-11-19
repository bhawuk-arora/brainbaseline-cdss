"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, ClinicianSummary } from "@/lib/api";
import {
  Building2,
  UserCheck,
  Stethoscope,
  CreditCard,
  FileCheck2,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  History,
  LifeBuoy,
  FileQuestion,
  Receipt,
  UserX,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Users,
} from "lucide-react";

interface RegisteredPatientRecord {
  log_id: number;
  patient_id: string;
  patient_name: string;
  mrn: string;
  insurance_provider: string;
  copay_status: string;
  attending_clinician_id: string;
  attending_clinician_name: string;
  registered_by: string;
  timestamp: string;
  is_active: boolean;
}

export default function ReceptionDeskPage() {
  const { lang, activeUserId, activeRole, isAuthenticated } = useApp();
  const router = useRouter();

  // Authentication Route Guard
  useEffect(() => {
    if (!isAuthenticated || (activeRole !== "receptionist" && activeRole !== "admin" && activeRole !== "director")) {
      router.push("/auth");
    }
  }, [isAuthenticated, activeRole, router]);

  const [activeTab, setActiveTab] = useState<"intake" | "history" | "resolution">("intake");
  const [clinicians, setClinicians] = useState<ClinicianSummary[]>([]);
  const [registeredList, setRegisteredList] = useState<RegisteredPatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [emiratesId, setEmiratesId] = useState("");
  const [age, setAge] = useState<number>(55);
  const [sex, setSex] = useState<"F" | "M">("F");
  const [language, setLanguage] = useState<"en" | "ar">("ar");
  const [insurance, setInsurance] = useState("Thiqa (Daman)");
  const [copay, setCopay] = useState("completed");
  const [selectedClinician, setSelectedClinician] = useState("");
  const [department, setDepartment] = useState("Cognitive Neurology / Memory Clinic");
  const [chiefComplaint, setChiefComplaint] = useState("Memory concerns / Annual cognitive vitality screen");
  const [triagePriority, setTriagePriority] = useState<"routine" | "urgent" | "fast_track">("routine");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reception Front Desk Problem Resolver modal/state
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getClinicians(),
      api.getReceptionRegisteredPatients(),
    ])
      .then(([clins, history]) => {
        setClinicians(clins);
        if (clins.length > 0 && !selectedClinician) {
          setSelectedClinician(clins[0].id);
        }
        setRegisteredList(history);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Patient name is required.");
      return;
    }
    if (!emiratesId.trim()) {
      setErrorMsg("Emirates ID or National Identifier is required.");
      return;
    }
    if (!selectedClinician) {
      setErrorMsg("Please assign an attending physician.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await api.checkinPatientAtReception({
        name: name.trim(),
        emirates_id_or_mrn: emiratesId.trim(),
        insurance_provider: insurance,
        copay_status: copay,
        department,
        attending_clinician_id: selectedClinician,
        age,
        sex,
        language,
        education_band: "mid",
        receptionist_id: activeUserId || "staff_reception_ccad",
        chief_complaint: chiefComplaint,
        triage_priority: triagePriority,
      });

      setCheckinSuccess(res);
      setIsSubmitting(false);
      setName("");
      setEmiratesId("");
      loadData();
    } catch (err: any) {
      console.error("Check-in error:", err);
      setIsSubmitting(false);
      setErrorMsg(err.message || "Failed to process hospital check-in.");
    }
  };

  const filteredHistory = registeredList.filter((r) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase().trim();
    return (
      r.patient_name.toLowerCase().includes(q) ||
      r.mrn.toLowerCase().includes(q) ||
      r.patient_id.toLowerCase().includes(q) ||
      r.attending_clinician_name.toLowerCase().includes(q)
    );
  });

  const RECEPTION_SOLUTIONS = [
    {
      id: "emirates_id_expired",
      title: "Expired Emirates ID or Renewal in Progress",
      category: "Identity & Admissions",
      solution: "Enter the Application Number from the ICP renewal receipt or Passport Number with UAE Residency Visa. Select Thiqa / Daman manual verification override in the billing section.",
    },
    {
      id: "malaffi_consent_pending",
      title: "Malaffi HIE / EHR Direct Consent Required",
      category: "Health Information Exchange",
      solution: "Provide the patient with the unified DoH digital consent form on the intake iPad. If the patient opts out of Malaffi HIE, check 'Cognition-Only Screening' under the consent toggle.",
    },
    {
      id: "copay_discrepancy",
      title: "Insurance Co-Pay / Prior Authorization Denied",
      category: "Billing & Claims",
      solution: "Abu Dhabi Thiqa holders receive 100% exemption on cognitive vitality screenings (DOH-CDSS Circular 4/2026). Select 'Exempt: Senior Citizen / Government Exemption' to bypass claim hold.",
    },
    {
      id: "doctor_shift_change",
      title: "Assigned Doctor Offline / Shift Change Handover",
      category: "Physician Routing",
      solution: "If the primary attending physician is marked 'On-Call' or offline, select an on-duty specialist from the active roster. The queue transfer automatically routes in real-time.",
    },
    {
      id: "language_interpreter",
      title: "Elderly Patient Requires Audio or Dialect Accompaniment",
      category: "Patient Care",
      solution: "Set preferred language to 'Arabic' in the intake form. The screening tablet will automatically enable localized audio narration and simplified visual sequence tasks.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-2xs">
              <Building2 className="w-5 h-5 text-teal-400 dark:text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Admissions Desk & Reception Triage
              </h1>
              <p className="text-xs text-slate-500">
                Outpatient Walk-In Registration • Attending Doctor Routing • Registration Track & Desk Resolution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            Admissions Desk Online
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("intake")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === "intake"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Patient Intake & Check-In</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === "history"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Registered Patients Track ({registeredList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("resolution")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === "resolution"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Front Desk Problem Resolver (5 Guides)</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {checkinSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Patient Registered & Dispatched Successfully</span>
            </span>
            <button
              onClick={() => setCheckinSuccess(null)}
              className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px]">
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-slate-400 block">Registered Patient</span>
              <span className="font-bold text-slate-900 dark:text-white">{checkinSuccess.patient_name}</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-slate-400 block">Medical Record No. (MRN)</span>
              <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">{checkinSuccess.mrn}</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-slate-400 block">Assigned Attending Doctor</span>
              <span className="font-bold text-slate-900 dark:text-white">{checkinSuccess.attending_clinician_name}</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-slate-400 block">Status</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">Queued in Doctor Console</span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: INTAKE & CHECK-IN FORM */}
      {activeTab === "intake" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Patient Intake & Clinic Check-In
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Register walk-in outpatients, assign attending specialists, and route to screening consoles.
              </p>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sultan Mansoor Al-Ketbi"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Emirates ID / National ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={emiratesId}
                    onChange={(e) => setEmiratesId(e.target.value)}
                    placeholder="784-1970-1234567-1"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="105"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 50)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="ar">العربية (Arabic)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Insurance Provider
                  </label>
                  <select
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Thiqa (Daman)">Thiqa (Daman) — Government Network</option>
                    <option value="Daman Enhanced">Daman Enhanced / Global</option>
                    <option value="NAS Administration">NAS Neurological Tier</option>
                    <option value="ADNIC">ADNIC Platinum / Gold</option>
                    <option value="Self-Pay">Self-Pay / Institutional Billing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Co-Pay / Authorization Status
                  </label>
                  <select
                    value={copay}
                    onChange={(e) => setCopay(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="completed">Completed / Settled (AED 0 Thiqa Exemption)</option>
                    <option value="exempt">Senior Citizen / Government Exemption</option>
                    <option value="pending">Pending Institutional Billing</option>
                  </select>
                </div>
              </div>

              {/* Triage Priority & Complaint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary Reason for Visit
                  </label>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Memory checkup, follow-up, sleep issue"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Intake Priority Tier
                  </label>
                  <select
                    value={triagePriority}
                    onChange={(e) => setTriagePriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="routine">Routine Ambulatory Screening (Standard SLA)</option>
                    <option value="urgent">Urgent Symptoms Reported (Fast-Track Review)</option>
                    <option value="fast_track">Direct Specialty Escalation</option>
                  </select>
                </div>
              </div>

              {/* Attending Specialist Direct Selection */}
              <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
                <label className="block text-xs font-bold text-teal-950 dark:text-teal-200">
                  Assigned Attending Clinician *
                </label>
                <select
                  required
                  value={selectedClinician}
                  onChange={(e) => setSelectedClinician(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {clinicians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.specialty} ({c.department})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-teal-800 dark:text-teal-300">
                  Patient record and screening results immediately link to this physician's Gate 5 review queue.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>{isSubmitting ? "Registering & Dispatching..." : "Complete Check-In & Generate MRN"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right: Active Specialists On-Duty Roster */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Specialist Doctors ({clinicians.length})
                </h3>
                <span className="text-[10px] text-teal-600 font-semibold">Live Routing</span>
              </div>

              <div className="space-y-2.5">
                {clinicians.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClinician(c.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      selectedClinician === c.id
                        ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.status === "active" ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      }`}>
                        {c.status === "active" ? "Available" : "On-Call"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.department}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
                      <span>{c.specialty}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{c.active_cases_count} cases in queue</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEPTION TRACK - WHICH PATIENTS WERE REGISTERED */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Reception Registration Track
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono">
                  {filteredHistory.length} Registered Patients
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Audited chronological log of all walk-in patients checked in by reception desks with attending doctor dispatch.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search registered patient or MRN..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                onClick={loadData}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition"
                title="Refresh registrations"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Registration Time</th>
                  <th className="p-3.5">Patient Name</th>
                  <th className="p-3.5">Assigned System ID</th>
                  <th className="p-3.5">MRN Identifier</th>
                  <th className="p-3.5">Insurance Provider</th>
                  <th className="p-3.5">Co-Pay Status</th>
                  <th className="p-3.5">Assigned Doctor</th>
                  <th className="p-3.5">Desk Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No matching patient registrations found in reception history.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.log_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {item.patient_name}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {item.patient_id.startsWith("PAT-")
                          ? item.patient_id
                          : item.patient_id.startsWith("patient_")
                          ? `PAT-${item.patient_id.replace("patient_", "").padStart(4, "0")}`
                          : item.patient_id}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-teal-700 dark:text-teal-400 font-bold">
                        {item.mrn || "N/A"}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {item.insurance_provider}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.copay_status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : item.copay_status === "exempt"
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {item.copay_status}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>{item.attending_clinician_name || item.attending_clinician_id}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {item.registered_by}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FRONT DESK PROBLEM RESOLVER (COMMON DOCKETS / ISSUES) */}
      {activeTab === "resolution" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Front Desk Problem Resolver & Operational Playbook
            </h2>
            <p className="text-xs text-slate-500">
              Instant standard operating procedures (SOPs) for reception desks to solve common identity, billing, and routing bottlenecks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RECEPTION_SOLUTIONS.map((doc) => {
              const isOpen = activeFaq === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveFaq(isOpen ? null : doc.id)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                        <FileQuestion className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                          {doc.category}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {doc.title}
                        </h3>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white block mb-1">
                      Action Protocol:
                    </span>
                    {doc.solution}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
