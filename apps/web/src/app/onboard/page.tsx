"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import {
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Stethoscope,
} from "lucide-react";

export default function OnboardPatientPage() {
  const router = useRouter();
  const { lang, setActiveUserId, setActiveRole } = useApp();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: 65,
    sex: "F" as "F" | "M",
    language: "en" as "en" | "ar",
    education_band: "mid" as "low" | "mid" | "high",
    phone_or_mrn: "",
    consent_cognition: true,
    consent_ehr: true,
    risk_factors: [] as string[],
  });

  const toggleRisk = (key: string) => {
    const current = new Set(formData.risk_factors);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    setFormData({ ...formData, risk_factors: Array.from(current) });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Please enter patient full name.");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await api.onboardPatient(formData);
      // Auto-set as active patient and route directly to baseline check-in
      setActiveUserId(res.user_id);
      setActiveRole("participant");
      router.push("/check");
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      setErrorMsg(err.message || "Failed to register patient.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-semibold">
          <UserPlus className="w-3.5 h-3.5 text-teal-600" />
          <span>Clinical Intake / New Patient</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Onboard Real Patient
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Registers the patient in the secure longitudinal registry and initializes their personalized 4-session calibration baseline.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Intake Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs text-slate-400">
            Demographic Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mariam Al-Dhaheri or John Smith"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  min={18}
                  max={110}
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 60 })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Biological Sex
                </label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value as "F" | "M" })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as "en" | "ar" })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="en">English</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Formal Education Cohort
                </label>
                <select
                  value={formData.education_band}
                  onChange={(e) => setFormData({ ...formData, education_band: e.target.value as any })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="low">Primary / Elementary</option>
                  <option value="mid">Secondary / High School</option>
                  <option value="high">University / Postgraduate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number or Hospital MRN
              </label>
              <input
                type="text"
                value={formData.phone_or_mrn}
                onChange={(e) => setFormData({ ...formData, phone_or_mrn: e.target.value })}
                placeholder="+971 50 xxx xxxx or MRN-94812"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Integrated Abu Dhabi Risk Profile Factors */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
                Integrated Health, Sleep & Genomic Risk Factors
              </h2>
              <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                {formData.risk_factors.length} Selected
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Select verified clinical, metabolic, sensory, and genomic indicators (from Malaffi / Emirati Genome Program):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                { id: "hypertension", label: "Hypertension (Blood Pressure)", cat: "Metabolic" },
                { id: "diabetes", label: "Type 2 Diabetes / Insulin Resistance", cat: "Metabolic" },
                { id: "sleep_apnea", label: "Sleep Apnea / Chronic Sleep Dip", cat: "Sleep" },
                { id: "hearing_loss", label: "Uncorrected Hearing Loss", cat: "Sensory" },
                { id: "family_history", label: "First-Degree Family History", cat: "Genomic" },
                { id: "apoe4_carrier", label: "APOE-ε4 Allele Carriage", cat: "Genomic" },
                { id: "physical_inactivity", label: "Physical Inactivity (<150m/wk)", cat: "Lifestyle" },
                { id: "depression", label: "Depression / Mood Disruption", cat: "Lifestyle" },
              ].map((rf) => {
                const checked = formData.risk_factors.includes(rf.id);
                return (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => toggleRisk(rf.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                      checked
                        ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-semibold"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{rf.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
                      {rf.cat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Consent Toggles */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Governance & Consent
            </h2>

            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.consent_cognition}
                onChange={(e) => setFormData({ ...formData, consent_cognition: e.target.checked })}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span>
                Consent for longitudinal memory, sequence studio, and Go/No-Go reaction speed tracking (Gate 1).
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.consent_ehr}
                onChange={(e) => setFormData({ ...formData, consent_ehr: e.target.checked })}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span>
                Consent to connect Malaffi / FHIR health records for reversible etiology assessment (Gate 3).
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white dark:bg-white dark:text-slate-900 font-medium text-sm transition flex items-center justify-center gap-2 shadow-xs"
        >
          <span>{isSubmitting ? "Registering..." : "Register Patient & Start Session 1"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
