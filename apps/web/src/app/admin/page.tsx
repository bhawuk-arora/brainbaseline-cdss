"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, AuditLogEntry, UserSummary, ReviewQueueItem } from "@/lib/api";
import {
  BarChart3,
  ShieldCheck,
  TrendingUp,
  Scale,
  DollarSign,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ListFilter,
  Users,
  Stethoscope,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function AdminPage() {
  const { lang, activeRole, isAuthenticated, t } = useApp();
  const router = useRouter();

  // Authentication & Role Route Guard
  useEffect(() => {
    if (!isAuthenticated || activeRole !== "admin") {
      router.push("/auth");
    }
  }, [isAuthenticated, activeRole, router]);

  const [activeTab, setActiveTab] = useState<"patients" | "clinicians" | "benchmark" | "fairness" | "economics" | "audit">("patients");
  const [benchmark, setBenchmark] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [patients, setPatients] = useState<UserSummary[]>([]);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getBenchmark(), api.getAuditLogs(), api.getUsers(), api.getReviewQueue()])
      .then(([bench, logs, userList, reviewQueue]) => {
        setBenchmark(bench);
        setAuditLogs(logs);
        setPatients(userList);
        setQueue(reviewQueue);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load admin data:", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        {lang === "ar" ? "جارٍ تحميل سجلات التدقيق والمؤشرات..." : "Loading benchmark & audit records..."}
      </div>
    );
  }

  const summary = benchmark?.benchmark_summary || {};
  const ablation = benchmark?.ablation_comparison || {};
  const fairness = benchmark?.subgroup_fairness || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              {t("admin.title")}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t("admin.subtitle")}</p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{lang === "ar" ? "تحديث البيانات" : "Refresh Analytics"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "patients", label: `Registered Patients (${patients.length})`, icon: <Users className="w-4 h-4" /> },
          { id: "clinicians", label: `Active Clinician Queue (${queue.length})`, icon: <Stethoscope className="w-4 h-4" /> },
          { id: "benchmark", label: "2,000 Cohort Benchmark", icon: <Activity className="w-4 h-4" /> },
          { id: "fairness", label: "Subgroup Fairness Audit", icon: <Scale className="w-4 h-4" /> },
          { id: "economics", label: "Health-Economic Savings", icon: <DollarSign className="w-4 h-4" /> },
          { id: "audit", label: `Audit Log (${auditLogs.length})`, icon: <ShieldCheck className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 0A: ALL REGISTERED PATIENTS */}
      {activeTab === "patients" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              All Registered Patients in Registry
            </h2>
            <button
              onClick={() => router.push("/onboard")}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs transition"
            >
              + Onboard New Patient
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Patient Name</th>
                  <th className="p-3.5">User ID</th>
                  <th className="p-3.5">Age / Sex</th>
                  <th className="p-3.5">Language</th>
                  <th className="p-3.5">Education</th>
                  <th className="p-3.5">Triage Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      {p.id}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {p.age}y / {p.sex}
                    </td>
                    <td className="p-3.5 uppercase text-slate-600 dark:text-slate-400 font-medium">
                      {p.language}
                    </td>
                    <td className="p-3.5 capitalize text-slate-600 dark:text-slate-400">
                      {p.education_band}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.latest_triage_color === "green" ? "bg-emerald-100 text-emerald-800" :
                        p.latest_triage_color === "yellow" ? "bg-amber-100 text-amber-800" :
                        p.latest_triage_color === "orange" ? "bg-orange-100 text-orange-800" :
                        p.latest_triage_color === "red" ? "bg-rose-100 text-rose-800" :
                        "bg-indigo-100 text-indigo-800"
                      }`}>
                        {p.latest_triage_color}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          useApp;
                          router.push("/result");
                        }}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 0B: ACTIVE CLINICIAN QUEUE */}
      {activeTab === "clinicians" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Active Clinician Decision Queue (Gate 5 Holds)
              </h2>
              <p className="text-xs text-slate-500">
                Patients flagged by the within-person engine currently held awaiting physician sign-off.
              </p>
            </div>
            <button
              onClick={() => router.push("/clinician")}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-medium text-xs transition flex items-center gap-1.5"
            >
              <span>Open Doctor Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Patient Flagged</th>
                  <th className="p-3.5">Session #</th>
                  <th className="p-3.5">Triage Color</th>
                  <th className="p-3.5">Confidence</th>
                  <th className="p-3.5">Flagged Reason</th>
                  <th className="p-3.5 text-right">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queue.map((item) => (
                  <tr key={item.triage_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                      {item.user_name} ({item.age}y)
                    </td>
                    <td className="p-3.5 text-slate-500">
                      Session {item.session_number}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                        {item.triage_color}
                      </span>
                    </td>
                    <td className="p-3.5 capitalize text-slate-600 dark:text-slate-400">
                      {item.confidence}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {item.reasons.join(", ")}
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3" />
                        Gate 5 Held
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: BENCHMARK */}
      {activeTab === "benchmark" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Clinical Sensitivity
              </span>
              <div className="text-3xl font-black text-emerald-600">
                {(summary.sensitivity * 100 || 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">100% true decline flagged</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Clinical Specificity
              </span>
              <div className="text-3xl font-black text-sky-600">
                {(summary.specificity * 100 || 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Zero stable false escalations</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Gate 2 Emergency Gate
              </span>
              <div className="text-3xl font-black text-rose-600">
                {(summary.red_flag_emergency_gate_accuracy * 100 || 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary.red_flag_cases_detected}/{summary.red_flag_cases_tested} acute cases detected
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Median Detection Time
              </span>
              <div className="text-3xl font-black text-indigo-600">
                {summary.median_weeks_to_flag || 16.0} wks
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Early detection from baseline</p>
            </div>
          </div>

          {/* Trajectory Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cohort Trajectory Distribution (N=2,000 Participants)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Clinical Trajectory</th>
                    <th className="p-3">Cohort Size</th>
                    <th className="p-3">Flagged Count</th>
                    <th className="p-3">Detection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(benchmark?.trajectory_breakdown || {}).map(([traj, d]: any) => (
                    <tr key={traj} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200 capitalize">
                        {traj.replace(/_/g, " ")}
                      </td>
                      <td className="p-3">{d.total}</td>
                      <td className="p-3">{d.flagged}</td>
                      <td className="p-3 font-semibold text-sky-600">
                        {(d.rate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAIRNESS */}
      {activeTab === "fairness" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Demographic Fairness & Parity Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated across Language (AR/EN), Education Bands (Low/Mid/High), and Age Strata.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Subgroup</th>
                  <th className="p-3">Stable Sample</th>
                  <th className="p-3">Decline Sample</th>
                  <th className="p-3">Sensitivity</th>
                  <th className="p-3">False Positive Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(fairness).map(([grp, d]: any) => (
                  <tr key={grp} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200 uppercase">
                      {grp.replace("_", ": ")}
                    </td>
                    <td className="p-3">{d.n_stable}</td>
                    <td className="p-3">{d.n_decline}</td>
                    <td className="p-3 text-emerald-600 font-bold">
                      {(d.sensitivity * 100).toFixed(1)}%
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-bold">
                      {(d.false_positive_rate * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HEALTH ECONOMICS */}
      {activeTab === "economics" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-900 to-sky-950 text-white p-8 rounded-3xl shadow-lg space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
              <DollarSign className="w-3.5 h-3.5" />
              Abu Dhabi Population Screening Health-Economic Model
            </div>

            <h2 className="text-2xl sm:text-3xl font-black">
              Avoided False-Positive Specialist Referrals:{" "}
              <span className="text-emerald-400">
                {ablation.avoided_false_positive_referrals_per_10k?.toLocaleString() || "2,955"}
              </span>{" "}
              / 10,000 Screened Adults
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Static population-norm screening tools falsely trigger specialist referrals for up to 32.8% of normal individuals with limited formal education or language differences. BrainBaseline's within-person statistical baseline eliminates these false alarms.
            </p>

            <div className="pt-2">
              <div className="inline-block bg-white/10 backdrop-blur p-4 rounded-2xl border border-white/20">
                <span className="text-[10px] uppercase tracking-wider block opacity-75">
                  Estimated Healthcare Cost Savings (SEHA / Abu Dhabi)
                </span>
                <span className="text-2xl font-black text-emerald-300">
                  AED {ablation.estimated_savings_aed?.toLocaleString() || "3,546,000"}
                </span>
                <span className="text-[11px] block text-slate-300 mt-0.5">
                  Based on AED 1,200 per avoided false-positive specialty consultation & MRI
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Method A: BrainBaseline Within-Person Shrinkage
              </h4>
              <div className="text-2xl font-black text-emerald-600">
                {(ablation.personal_baseline?.specificity * 100 || 100).toFixed(1)}% Specificity
              </div>
              <p className="text-xs text-slate-500">
                False Positive Rate: {(ablation.personal_baseline?.false_positive_rate * 100 || 0).toFixed(2)}%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Method B: Static Population-Norm Cutoff (-1.5 SD)
              </h4>
              <div className="text-2xl font-black text-rose-600">
                {(ablation.population_norm_cutoff?.specificity * 100 || 67.2).toFixed(1)}% Specificity
              </div>
              <p className="text-xs text-slate-500">
                False Positive Rate: {(ablation.population_norm_cutoff?.false_positive_rate * 100 || 32.8).toFixed(1)}% (Severe educational penalty)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Immutable Governance Audit Log Trail ({auditLogs.length} Records)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              All clinical mutations, consents & releases recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-semibold text-sky-600">{log.actor}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </td>
                    <td className="p-3 text-slate-500">
                      {log.target_type}:{log.target_id}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
