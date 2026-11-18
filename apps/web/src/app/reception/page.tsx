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
} from "lucide-react";

export default function ReceptionDeskPage() {
  const { lang, activeUserId, activeRole, isAuthenticated } = useApp();
  const router = useRouter();

  // Authentication Route Guard
  useEffect(() => {
    if (!isAuthenticated || (activeRole !== "receptionist" && activeRole !== "admin" && activeRole !== "director")) {
      router.push("/auth");
    }
  }, [isAuthenticated, activeRole, router]);

  const [clinicians, setClinicians] = useState<ClinicianSummary[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getClinicians()
      .then((clins) => {
        setClinicians(clins);
        if (clins.length > 0) {
          setSelectedClinician(clins[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
        name,
        emirates_id_or_mrn: emiratesId,
        insurance_provider: insurance,
        copay_status: copay,
        department,
        attending_clinician_id: selectedClinician,
        age,
        sex,
        language,
        education_band: "mid",
      });

      setCheckinSuccess(res);
      setIsSubmitting(false);
      // Reset input fields
      setName("");
      setEmiratesId("");
    } catch (err: any) {
      console.error("Check-in error:", err);
      setIsSubmitting(false);
      setErrorMsg(err.message || "Failed to process hospital check-in.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hospital Reception & Patient Admissions
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-normal">
            Front Desk Outpatient Registration • Emirates ID Verification • Attending Physician Direct Routing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
            Admissions Desk Active
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {checkinSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Patient Admissions & Check-In Complete</span>
            </span>
            <button
              onClick={() => setCheckinSuccess(null)}
              className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
            <div className="p-2.5 bg-white/80 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-400 block">Registered Patient</span>
              <span className="font-bold text-slate-900 dark:text-white">{checkinSuccess.patient_name}</span>
            </div>
            <div className="p-2.5 bg-white/80 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-400 block">Medical Record No. (MRN)</span>
              <span className="font-bold text-teal-700 dark:text-teal-400">{checkinSuccess.mrn}</span>
            </div>
            <div className="p-2.5 bg-white/80 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-400 block">Assigned Attending Doctor</span>
              <span className="font-bold text-slate-900 dark:text-white">{checkinSuccess.attending_clinician_name}</span>
            </div>
            <div className="p-2.5 bg-white/80 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-400 block">Status</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">Queued in Doctor Console</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-200 pt-1">
            {checkinSuccess.message}
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Registration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Walk-In Intake Form */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Patient Intake & Clinic Check-In
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter patient identification and assign to the attending neurologist / geriatric specialist.
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
                  placeholder="e.g. 784-1970-1234567-1"
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
                  Preferred Language
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

            {/* Crucial Attending Clinician Selection */}
            <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
              <label className="block text-xs font-bold text-teal-950 dark:text-teal-200">
                Assigned Attending Clinician (Direct Routing to Workstation) *
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
                Patient check-in session will automatically appear in this physician's queue for baseline and review.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs"
            >
              <span>{isSubmitting ? "Registering & Routing..." : "Complete Check-In & Issue MRN Token"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Info: Available Attending Doctors Today */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Attending Specialists ({clinicians.length})
            </h3>
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
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100 dark:bg-teal-900 px-1.5 py-0.5 rounded">
                      Available
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.department}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
                    <span>License: {c.license_id}</span>
                    <span>{c.active_cases_count} Active Cases</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
