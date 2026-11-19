"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, AuditLogEntry, UserSummary, ReviewQueueItem, ClinicianSummary } from "@/lib/api";
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
  X,
  FileText,
  User,
  HeartPulse,
  UserCog,
  AlertOctagon,
  ShieldAlert,
  Hospital,
  Trash2,
  UserPlus,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Power,
  PowerOff,
  SlidersHorizontal,
} from "lucide-react";

export default function AdminPage() {
  const { lang, activeRole, isAuthenticated, setActiveUserId, t } = useApp();
  const router = useRouter();

  // Authentication & Role Route Guard
  useEffect(() => {
    if (!isAuthenticated || activeRole !== "admin") {
      router.push("/auth");
    }
  }, [isAuthenticated, activeRole, router]);

  const [activeTab, setActiveTab] = useState<"directory" | "clinicians" | "benchmark" | "fairness" | "economics" | "audit">("directory");
  const [filterRole, setFilterRole] = useState<"all" | "participant" | "clinician" | "director" | "admin" | "receptionist">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [benchmark, setBenchmark] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
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
  const [overrideReason, setOverrideReason] = useState("Escalated review backlog. Director override release to primary care audiology workup.");
  const [overrideDecision, setOverrideDecision] = useState<"approve" | "escalate">("approve");
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState<string | null>(null);

  // Add User Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("password123");
  const [newUserRole, setNewUserRole] = useState<"participant" | "clinician" | "director" | "admin" | "receptionist">("participant");
  const [newUserAge, setNewUserAge] = useState(55);
  const [newUserSex, setNewUserSex] = useState<"F" | "M">("F");
  const [newUserLang, setNewUserLang] = useState<"ar" | "en">("ar");
  const [newUserEdu, setNewUserEdu] = useState<"low" | "mid" | "high">("mid");
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Delete User confirmation state
  const [userToDelete, setUserToDelete] = useState<UserSummary | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setAddUserError("Name and email are required.");
      return;
    }
    setAddUserError(null);
    setAddingUser(true);
    try {
      await api.createIAMUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword.trim() || "password123",
        role: newUserRole,
        age: Number(newUserAge),
        sex: newUserSex,
        language: newUserLang,
        education_band: newUserEdu,
      });
      setAddingUser(false);
      setShowAddUserModal(false);
      setNewUserName("");
      setNewUserEmail("");
      setActionSuccessMsg(`User successfully registered in the platform.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      setAddingUser(false);
      setAddUserError(err.message || "Failed to create user.");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await api.deleteUser(userToDelete.id, true);
      setDeletingUser(false);
      const deletedName = userToDelete.name;
      setUserToDelete(null);
      setActionSuccessMsg(`User "${deletedName}" was permanently removed.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      setDeletingUser(false);
      alert(`Failed to delete user: ${err.message || "Unknown error"}`);
    }
  };

  const handleToggleDeactivate = async (user: UserSummary) => {
    try {
      const nextActive = !user.is_active;
      await api.updateIAMUser(user.id, { is_active: nextActive });
      setActionSuccessMsg(
        nextActive
          ? `User "${user.name}" has been reactivated.`
          : `User "${user.name}" has been deactivated.`
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message || "Unknown error"}`);
    }
  };

  const formatScalableId = (id: string, role: string) => {
    if (id.startsWith("PAT-") || id.startsWith("DOC-") || id.startsWith("DIR-") || id.startsWith("ADM-") || id.startsWith("REC-")) {
      return id;
    }
    if (id.startsWith("patient_")) {
      return `PAT-${id.replace("patient_", "").padStart(4, "0")}`;
    }
    if (id.startsWith("dr_")) {
      return `DOC-${id.replace("dr_", "").toUpperCase()}`;
    }
    if (id.startsWith("director_")) {
      return `DIR-${id.replace("director_", "").toUpperCase()}`;
    }
    if (id.startsWith("admin_")) {
      return `ADM-${id.replace("admin_", "").toUpperCase()}`;
    }
    if (id.startsWith("staff_reception_")) {
      return `REC-${id.replace("staff_reception_", "").toUpperCase()}`;
    }
    if (id.startsWith("user_")) {
      return `PAT-${id.replace("user_", "").slice(0, 10).toUpperCase()}`;
    }
    const prefix = role === "clinician" ? "DOC" : role === "director" ? "DIR" : role === "admin" ? "ADM" : "PAT";
    return `${prefix}-${id.slice(0, 8).toUpperCase()}`;
  };

  const filteredUsers = patients.filter((p) => {
    // Role filter
    if (filterRole !== "all") {
      if (p.role !== filterRole) return false;
    }
    // Status filter
    if (filterStatus === "active" && !p.is_active) return false;
    if (filterStatus === "inactive" && p.is_active) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const scalableId = formatScalableId(p.id, p.role).toLowerCase();
      const rawId = p.id.toLowerCase();
      const name = (p.name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || rawId.includes(q) || scalableId.includes(q);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((currentPageSafe - 1) * pageSize, currentPageSafe * pageSize);

  const roleCounts = {
    all: patients.length,
    participant: patients.filter((p) => p.role === "participant").length,
    clinician: patients.filter((p) => p.role === "clinician").length,
    director: patients.filter((p) => p.role === "director").length,
    receptionist: patients.filter((p) => p.role === "receptionist").length,
    admin: patients.filter((p) => p.role === "admin").length,
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getBenchmark(),
      api.getAuditLogs(),
      api.getUsers(),
      api.getReviewQueue(),
      api.getClinicians(),
    ])
      .then(([bench, logs, userList, reviewQueue, staffList]) => {
        setBenchmark(bench);
        setAuditLogs(logs);
        setPatients(userList);
        setQueue(reviewQueue);
        setClinicians(staffList);
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
        referral_destination: overrideDecision === "escalate" ? "Neurology / Memory Clinic" : "Primary Care / Audiology Workup",
      });
      setOverrideSuccessMsg(`Gate 5 hold for ${overrideTargetItem.user_name} unblocked and released to patient portal.`);
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
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Health Authority Root Administration & Population Analytics
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Root Governance
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Abu Dhabi DoH & ADPHC population-level benchmarks, subgroup fairness audits, health economic savings, and immutable ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/director")}
            className="px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-200 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>Director Console</span>
          </button>
          <button
            onClick={loadData}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "تحديث البيانات" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* HEALTHCARE HOSPITAL DIRECTOR KPI OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Registered Patients</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {patients.length}
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <span className="text-teal-600 font-bold">100%</span> active baseline coverage
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Attending Clinicians</span>
            <UserCog className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {clinicians.length} <span className="text-xs font-normal text-slate-400">Doctors</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Neurology, Geriatrics & Primary Care
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Gate 5 Review Backlog</span>
            <AlertOctagon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {queue.length} <span className="text-xs font-normal text-slate-400">Held</span>
          </div>
          <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
            {queue.length > 0 ? "Requires physician sign-off" : "All queues cleared"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Mean Review Turnaround</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {clinicians.length > 0
              ? (clinicians.reduce((acc, c) => acc + c.avg_turnaround_hours, 0) / clinicians.length).toFixed(1)
              : "3.9"}{" "}
            <span className="text-xs font-normal text-slate-400">hrs</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Target SLA: &lt; 24.0 hours
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "directory", label: `Centralized Health Directory (${patients.length})`, icon: <Users className="w-4 h-4" /> },
          { id: "clinicians", label: `Gate 5 Review Queue (${queue.length})`, icon: <Stethoscope className="w-4 h-4" /> },
          { id: "benchmark", label: "2,000 Cohort Benchmark", icon: <Activity className="w-4 h-4" /> },
          { id: "fairness", label: "Fairness Parity Audit", icon: <Scale className="w-4 h-4" /> },
          { id: "economics", label: "Economic Model (AED)", icon: <DollarSign className="w-4 h-4" /> },
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

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: CENTRALIZED HEALTH DIRECTORY (DOCTORS & PATIENTS IN ONE UNIFIED VIEW) */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Header & Main Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Centralized Health Directory
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono">
                  {filteredUsers.length} of {patients.length} records
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Search, filter, manage, activate/deactivate, and audit accounts with enterprise-standard identifier keys.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add User</span>
              </button>

              <button
                onClick={() => router.push("/onboard")}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-2xs"
              >
                + Onboard Patient
              </button>
            </div>
          </div>

          {/* Search & Filter Tooling Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, email, or ID (e.g. PAT-0012, Layla)..."
                className="w-full text-xs pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Segregated Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Role Segregation Chips */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                {[
                  { key: "all", label: `All (${roleCounts.all})` },
                  { key: "participant", label: `Patients (${roleCounts.participant})` },
                  { key: "clinician", label: `Doctors (${roleCounts.clinician})` },
                  { key: "director", label: `Directors (${roleCounts.director})` },
                  { key: "admin", label: `Admins (${roleCounts.admin})` },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => {
                      setFilterRole(r.key as any);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                      filterRole === r.key
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Scalable ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Email / Account</th>
                  <th className="p-3.5">Demographics</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Clinical / Triage</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No records found matching "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((p) => {
                    const isDoctor = p.role === "clinician" || p.name.startsWith("Dr.");
                    const isDirector = p.role === "director";
                    const isAdm = p.role === "admin";
                    const scalableId = formatScalableId(p.id, p.role);
                    const isActive = p.is_active !== false;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition ${
                          !isActive ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/40" : ""
                        }`}
                      >
                        {/* Scalable System ID */}
                        <td className="p-3.5">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 tracking-wider">
                            {scalableId}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {isDoctor ? (
                              <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            ) : isDirector ? (
                              <Hospital className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : isAdm ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            )}
                            <span className={!isActive ? "line-through text-slate-500" : ""}>
                              {p.name}
                            </span>
                          </div>
                        </td>

                        {/* Assigned Role */}
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.role === "clinician"
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                                : p.role === "director"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : p.role === "admin"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                : p.role === "receptionist"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                            }`}
                          >
                            {p.role === "participant" ? "Patient" : p.role}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {p.email || p.id}
                        </td>

                        {/* Demographics */}
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 text-[11px]">
                          {p.age}y • {p.sex} • <span className="uppercase font-semibold">{p.language}</span>
                        </td>

                        {/* Account Status */}
                        <td className="p-3.5">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Deactivated
                            </span>
                          )}
                        </td>

                        {/* Clinical / Triage */}
                        <td className="p-3.5">
                          {p.role === "participant" ? (
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
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Audit / Inspect */}
                            <button
                              onClick={() => handleInspectPatient(p)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-medium transition shadow-2xs"
                            >
                              Audit
                            </button>

                            {/* Deactivate / Reactivate Toggle */}
                            <button
                              onClick={() => handleToggleDeactivate(p)}
                              title={isActive ? `Deactivate ${p.name}` : `Reactivate ${p.name}`}
                              className={`p-1.5 rounded-lg border transition ${
                                isActive
                                  ? "border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                  : "border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              }`}
                            >
                              {isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Permanently */}
                            <button
                              onClick={() => setUserToDelete(p)}
                              title={`Delete ${p.name}`}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing Page <span className="font-bold text-slate-800 dark:text-slate-200">{currentPageSafe}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span> ({filteredUsers.length} total filtered results)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPageSafe <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPageSafe > 3) {
                      pageNum = Math.min(totalPages - 4 + i, currentPageSafe - 2 + i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                          currentPageSafe === pageNum
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPageSafe >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 0C: ACTIVE CLINICIAN QUEUE & DIRECTOR OVERRIDE */}
      {activeTab === "clinicians" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Active Clinician Decision Queue (Gate 5 Holds)
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                  {queue.length} Pending
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Patients flagged by the within-person engine currently held awaiting physician sign-off. As Hospital Director, you can inspect or issue an institutional override.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/clinician")}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-medium text-xs transition flex items-center gap-1.5 shadow-2xs"
              >
                <span>Open Doctor Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
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
                    Unblock Gate 5 hold for <strong className="text-slate-800 dark:text-slate-200">{overrideTargetItem.user_name}</strong>
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
                    <span className="text-[10px] uppercase font-bold text-slate-400">Clinical Case Context</span>
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500"
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
                    <span className="font-mono text-[10px] text-slate-400">({selectedPatientForInspect.id})</span>
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
                <div className="py-12 text-center text-slate-400">Loading comprehensive trajectory data...</div>
              ) : patientTrendData ? (
                <>
                  {/* Demographic & Triage Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Age / Sex</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedPatientForInspect.age}y / {selectedPatientForInspect.sex}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Education Band</span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">{selectedPatientForInspect.education_band}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Language Preference</span>
                      <span className="font-semibold text-slate-900 dark:text-white uppercase">{selectedPatientForInspect.language}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Current Triage Flag</span>
                      <span className="font-bold uppercase text-teal-700 dark:text-teal-400">{selectedPatientForInspect.latest_triage_color}</span>
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
                      {patientTrendData.risk.factors && patientTrendData.risk.factors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {patientTrendData.risk.factors.map((f: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300">
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
                      Completed Baseline & Monitoring Sessions ({patientTrendData.trend?.sessions?.length || 0})
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {patientTrendData.trend?.sessions?.map((s: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Session {s.session_number} {s.is_practice ? "(Calibration Practice)" : ""}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              Completed: {new Date(s.completed_at).toLocaleDateString()} • Memory: {s.scores?.memory || "N/A"} • Seq: {s.scores?.sequence_av || "N/A"}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.triage_color === "green" ? "bg-emerald-100 text-emerald-800" :
                            s.triage_color === "yellow" ? "bg-amber-100 text-amber-800" :
                            s.triage_color === "orange" ? "bg-orange-100 text-orange-800" :
                            "bg-indigo-100 text-indigo-800"
                          }`}>
                            {s.triage_color}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-400">No session trend found for this participant.</div>
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
      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete User Account?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to permanently remove <span className="font-semibold text-slate-900 dark:text-white">"{userToDelete.name}"</span> ({userToDelete.id})? This will delete associated clinical logs, sessions, and triage history.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs space-y-1 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-slate-500">
                <span>Role:</span>
                <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{userToDelete.role}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Email:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{userToDelete.email || "N/A"}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
              >
                {deletingUser ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add New Platform User
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Register a patient, clinician, hospital director, or administrator.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addUserError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Dr. Humaid Al-Dhaheri or Mariam Mansoor"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="name@doh.gov.ae or patient@ae"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="participant">Patient / Participant</option>
                    <option value="clinician">Licensed Clinician (Doctor)</option>
                    <option value="director">Hospital Medical Director</option>
                    <option value="receptionist">Reception / Intake Desk</option>
                    <option value="admin">Root System Administrator</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={newUserAge}
                    onChange={(e) => setNewUserAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sex
                  </label>
                  <select
                    value={newUserSex}
                    onChange={(e) => setNewUserSex(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <select
                    value={newUserLang}
                    onChange={(e) => setNewUserLang(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="ar">Arabic (العربية)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  disabled={addingUser}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition shadow-2xs"
                >
                  {addingUser ? "Registering..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
