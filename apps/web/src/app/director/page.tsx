"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, UserSummary, ReviewQueueItem, ClinicianSummary } from "@/lib/api";
import {
  Hospital,
  Stethoscope,
  Clock,
  AlertOctagon,
  ShieldAlert,
  Users,
  CheckCircle,
  RotateCcw,
  ExternalLink,
  User,
  HeartPulse,
  FileText,
  X,
  UserCog,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default function DirectorPage() {
  const { lang, activeRole, isAuthenticated, t } = useApp();
  const router = useRouter();

  // Authentication & Role Route Guard: Accessible by Hospital Director and Root Admin
  useEffect(() => {
    if (!isAuthenticated || (activeRole !== "director" && activeRole !== "admin")) {
      router.push("/auth");
    }
  }, [isAuthenticated, activeRole, router]);

  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "queue" | "patients">("overview");
  const [patients, setPatients] = useState<UserSummary[]>([]);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [clinicians, setClinicians] = useState<ClinicianSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspector Modal state
  const [selectedPatientForInspect, setSelectedPatientForInspect] = useState<UserSummary | null>(null);
  const [patientTrendData, setPatientTrendData] = useState<any>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Director Override Modal state
  const [overrideTargetItem, setOverrideTargetItem] = useState<ReviewQueueItem | null>(null);
  const [overrideReason, setOverrideReason] = useState(
    "Escalated review backlog. Director override release to primary care audiology and metabolic workup."
  );
  const [overrideDecision, setOverrideDecision] = useState<"approve" | "escalate">("approve");
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getUsers(),
      api.getReviewQueue(),
      api.getClinicians(),
    ])
      .then(([userList, reviewQueue, staffList]) => {
        setPatients(userList);
        setQueue(reviewQueue);
        setClinicians(staffList);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load director data:", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspectPatient = (patient: UserSummary) => {
    setSelectedPatientForInspect(patient);
    setLoadingTrend(true);
    Promise.all([api.getUserTrend(patient.id), api.getUserRisk(patient.id)])
      .then(([trend, risk]) => {
        setPatientTrendData({ trend, risk });
        setLoadingTrend(false);
      })
      .catch((e) => {
        console.error("Failed to load patient trend:", e);
        setLoadingTrend(false);
      });
  };

  const handleExecuteDirectorOverride = async () => {
    if (!overrideTargetItem) return;
    try {
      await api.overrideRelease({
        triage_id: overrideTargetItem.triage_id,
        admin_id: "director_health_governance",
        decision: overrideDecision,
        override_reason: overrideReason,
        target_clinician_id: "dr_nour",
        referral_destination:
          overrideDecision === "escalate"
            ? "Neurology / Memory Clinic"
            : "Primary Care / Audiology Workup",
      });
      setOverrideSuccessMsg(
        `Gate 5 hold for ${overrideTargetItem.user_name} unblocked and released to patient portal.`
      );
      setTimeout(() => {
        setOverrideTargetItem(null);
        setOverrideSuccessMsg(null);
        loadData();
      }, 1400);
    } catch (err: any) {
      alert("Director override failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Loading hospital operational and clinical records...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl">
            <Hospital className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Hospital Medical Director Operations Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Clinical Authority
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervising attending physicians, clinical review backlogs, and patient cohort safety across hospital departments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/clinician")}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            <span>Doctor Console</span>
          </button>
          <button
            onClick={loadData}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Director Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Patient Cohort</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {patients.length} <span className="text-xs font-normal text-slate-400">Registered</span>
          </div>
          <p className="text-[10px] text-teal-600 font-medium">
            Active within-person monitoring
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Attending Clinicians</span>
            <UserCog className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {clinicians.length} <span className="text-xs font-normal text-slate-400">Physicians</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Neurology, Geriatrics & Primary Care
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Gate 5 Review Queue</span>
            <AlertOctagon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {queue.length} <span className="text-xs font-normal text-slate-400">Held</span>
          </div>
          <p className="text-[10px] text-amber-600 font-semibold">
            {queue.length > 0 ? "Awaiting doctor sign-off" : "All queues cleared"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Mean Review SLA</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {clinicians.length > 0
              ? (
                  clinicians.reduce((acc, c) => acc + c.avg_turnaround_hours, 0) /
                  clinicians.length
                ).toFixed(1)
              : "3.9"}{" "}
            <span className="text-xs font-normal text-slate-400">hrs</span>
          </div>
          <p className="text-[10px] text-slate-500">Target SLA: &lt; 24.0 hours</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "overview", label: "Operations Overview", icon: <Hospital className="w-4 h-4" /> },
          { id: "roster", label: `Medical Staff Roster (${clinicians.length})`, icon: <UserCog className="w-4 h-4" /> },
          { id: "queue", label: `Gate 5 Review Queue (${queue.length})`, icon: <Stethoscope className="w-4 h-4" /> },
          { id: "patients", label: `Hospital Patient Pool (${patients.length})`, icon: <Users className="w-4 h-4" /> },
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

      {/* TAB 1: OPERATIONS OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Director Operational Governance Protocol
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                As Hospital Medical Director, you possess clinical override authority to resolve clinician bottlenecks and ensure care continuity under DoH Abu Dhabi brain health safety mandates.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    What the Director Can Do:
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside text-[11px]">
                    <li>Oversee all attending clinicians & workloads</li>
                    <li>Inspect clinical records across all hospital patients</li>
                    <li>Execute institutional overrides to release Gate 5 holds</li>
                    <li>Reassign delayed reviews to on-call specialists</li>
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    Privilege Boundaries (What You Cannot Do):
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside text-[11px]">
                    <li>Cannot tamper with immutable audit hash logs</li>
                    <li>Cannot modify deterministic statistical math</li>
                    <li>Cannot bypass patient consent (Gate 1 hard stop)</li>
                    <li>Root system configuration is reserved for Root Admin</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Action Queue preview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Cases Requiring Director Attention ({queue.length})
                </h3>
                <button
                  onClick={() => setActiveTab("queue")}
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                >
                  <span>View All Queue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {queue.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  All clinical review queues are clear.
                </p>
              ) : (
                <div className="space-y-2">
                  {queue.map((item) => (
                    <div
                      key={item.triage_id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850"
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">
                          {item.user_name} ({item.age}y)
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-md">
                          {item.reasons.join("; ")}
                        </div>
                      </div>
                      <button
                        onClick={() => setOverrideTargetItem(item)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs transition"
                      >
                        Override / Release
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Medical Staff Overview
              </h3>
              <div className="space-y-3">
                {clinicians.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                      <span className="text-[10px] font-bold uppercase text-emerald-600">{c.status}</span>
                    </div>
                    <div className="text-[11px] text-teal-600">{c.specialty}</div>
                    <div className="text-[10px] text-slate-400">{c.department}</div>
                    <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                      <span>Active: {c.active_cases_count}</span>
                      <span>Overdue: {c.overdue_reviews_count}</span>
                      <span>Avg SLA: {c.avg_turnaround_hours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEDICAL STAFF ROSTER */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Attending Clinicians & Specialists Roster ({clinicians.length})
              </h2>
              <p className="text-xs text-slate-500">
                Staff licensing, assigned review queues, SLA turnaround metrics, and clinical override authority.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clinicians.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-300">
                      {doc.name.split(" ")[1]?.charAt(0) || "D"}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                        {doc.name}
                      </h3>
                      <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                        {doc.specialty}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      doc.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : doc.status === "on_call"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {doc.status.replace("_", " ")}
                  </span>
                </div>

                <div className="text-[11px] space-y-1 text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{doc.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>License ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{doc.license_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact:</span>
                    <span className="text-slate-600 dark:text-slate-400">{doc.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Active Cases</span>
                    <span className="font-black text-sm text-slate-900 dark:text-white">{doc.active_cases_count}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Overdue</span>
                    <span className={`font-black text-sm ${doc.overdue_reviews_count > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {doc.overdue_reviews_count}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Avg SLA</span>
                    <span className="font-black text-sm text-indigo-600">{doc.avg_turnaround_hours}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GATE 5 REVIEW QUEUE */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Gate 5 Review Queue ({queue.length} Cases Held)
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
                  <th className="p-3.5">Review Status</th>
                  <th className="p-3.5 text-right">Director Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No Gate 5 holds pending at this time. All routine cases released directly.
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => (
                    <tr key={item.triage_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        {item.user_name} ({item.age}y)
                      </td>
                      <td className="p-3.5 text-slate-500">Session {item.session_number}</td>
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
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          Gate 5 Held
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setOverrideTargetItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-semibold text-xs flex items-center gap-1.5 ml-auto transition shadow-2xs"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>Director Override</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HOSPITAL PATIENT POOL */}
      {activeTab === "patients" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                All Hospital Patients in Brain Health Registry ({patients.length})
              </h2>
              <p className="text-xs text-slate-500">
                Sample pool of diverse patients spanning genomics (APOE-ε4), metabolic risks, sleep apnea, and educational bands.
              </p>
            </div>
            <button
              onClick={() => router.push("/onboard")}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs transition shadow-2xs"
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
                  <th className="p-3.5 text-right">Clinical Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{p.id}</td>
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
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.latest_triage_color === "green"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.latest_triage_color === "yellow"
                            ? "bg-amber-100 text-amber-800"
                            : p.latest_triage_color === "orange"
                            ? "bg-orange-100 text-orange-800"
                            : p.latest_triage_color === "red"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {p.latest_triage_color}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleInspectPatient(p)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-medium transition shadow-2xs"
                      >
                        Audit Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HEALTHCARE DIRECTOR OVERRIDE MODAL */}
      {overrideTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-amber-50 dark:bg-amber-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                  <ShieldAlert className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Executive Clinical Override Authority
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Unblock Gate 5 hold for{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {overrideTargetItem.user_name}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOverrideTargetItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {overrideSuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-center font-bold">
                  {overrideSuccessMsg}
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Clinical Case Context
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {overrideTargetItem.user_name} (Age: {overrideTargetItem.age}y, Session #{overrideTargetItem.session_number})
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Flags: {overrideTargetItem.reasons.join(", ")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Director Decision Disposition
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOverrideDecision("approve")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          overrideDecision === "approve"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Approve Routine Action</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideDecision("escalate")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          overrideDecision === "escalate"
                            ? "bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                        }`}
                      >
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                        <span>Escalate Direct Specialist</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Governance Override Rationale (Logged into Immutable Audit)
                    </label>
                    <textarea
                      rows={3}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500"
                      placeholder="Specify rationale for executive override..."
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
                    <strong>Audit Notice:</strong> This action bypasses clinician sign-off delay and stamps the audit ledger with <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-[10px]">DIRECTOR_OVERRIDE_RELEASE</code> under institutional governance.
                  </div>
                </>
              )}
            </div>

            {!overrideSuccessMsg && (
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideTargetItem(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDirectorOverride}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition"
                >
                  Confirm & Release Gate 5
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEALTHCARE DIRECTOR PATIENT AUDIT INSPECTOR MODAL */}
      {selectedPatientForInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    Director Audit: {selectedPatientForInspect.name}
                    <span className="font-mono text-[10px] text-slate-400">
                      ({selectedPatientForInspect.id})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Comprehensive longitudinal health record, within-person trajectory & risk breakdown
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientForInspect(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {loadingTrend ? (
                <div className="py-12 text-center text-slate-400">
                  Loading comprehensive trajectory data...
                </div>
              ) : patientTrendData ? (
                <>
                  {/* Demographic & Triage Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Age / Sex</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedPatientForInspect.age}y / {selectedPatientForInspect.sex}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Education Band</span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">
                        {selectedPatientForInspect.education_band}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Language Preference</span>
                      <span className="font-semibold text-slate-900 dark:text-white uppercase">
                        {selectedPatientForInspect.language}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Current Triage Flag</span>
                      <span className="font-bold uppercase text-teal-700 dark:text-teal-400">
                        {selectedPatientForInspect.latest_triage_color}
                      </span>
                    </div>
                  </div>

                  {/* Integrated Risk Tier Profile */}
                  {patientTrendData.risk && (
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-850">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                          Integrated Health & Genomic Profile (Abu Dhabi Standard)
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                          {patientTrendData.risk.tier} Tier ({patientTrendData.risk.points} pts)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Recommended screening interval: Every {patientTrendData.risk.repeat_days} days.
                      </p>
                      {patientTrendData.risk.factors &&
                        patientTrendData.risk.factors.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {patientTrendData.risk.factors.map((f: any, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300"
                              >
                                {f.name_en || f.id}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Completed Sessions History */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      Completed Longitudinal Sessions ({patientTrendData.trend?.sessions?.length || 0})
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {patientTrendData.trend?.sessions?.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Session {s.session_number} {s.is_practice ? "(Calibration Practice)" : ""}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              Completed: {new Date(s.completed_at).toLocaleDateString()} • Memory:{" "}
                              {s.scores?.memory || "N/A"} • Seq: {s.scores?.sequence_av || "N/A"}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              s.triage_color === "green"
                                ? "bg-emerald-100 text-emerald-800"
                                : s.triage_color === "yellow"
                                ? "bg-amber-100 text-amber-800"
                                : s.triage_color === "orange"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {s.triage_color}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  No session trend found for this participant.
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                onClick={() => setSelectedPatientForInspect(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-medium transition"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
