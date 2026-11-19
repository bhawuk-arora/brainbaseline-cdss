/**
 * Strongly typed API client matching BrainBaseline FastAPI schemas.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ClinicianSummary {
  id: string;
  name: string;
  specialty: string;
  department: string;
  email: string;
  active_cases_count: number;
  overdue_reviews_count: number;
  avg_turnaround_hours: number;
  status: "active" | "on_call" | "offline";
  license_id: string;
}

export interface AdminOverridePayload {
  triage_id: string;
  admin_id?: string;
  decision: "approve" | "escalate";
  override_reason: string;
  target_clinician_id?: string;
  referral_destination?: string;
}

export interface IAMUserCreatePayload {
  name: string;
  email: string;
  password?: string;
  role: "participant" | "clinician" | "director" | "admin" | "receptionist";
  age: number;
  sex: "F" | "M";
  language: "ar" | "en";
  education_band: "low" | "mid" | "high";
  admin_actor?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
  role: "participant" | "clinician" | "director" | "admin" | "receptionist";
  is_active: boolean;
  age: number;
  sex: string;
  language: string;
  education_band: string;
  latest_triage_color: string;
  pending_review: boolean;
}

export interface PatientOnboardPayload {
  name: string;
  email?: string;
  age: number;
  sex: "F" | "M";
  language: "en" | "ar";
  education_band: "low" | "mid" | "high";
  phone_or_mrn?: string;
  consent_cognition: boolean;
  consent_ehr: boolean;
  risk_factors?: string[];
}

export interface PatientOnboardResult {
  user_id: string;
  name: string;
  message: string;
  session_id: string;
  session_number: number;
}

export interface AuthLoginPayload {
  email: string;
  password: string;
}

export interface AuthSendCodePayload {
  email: string;
  role: "participant" | "clinician" | "director" | "admin";
}

export interface AuthVerifyPayload {
  email: string;
  code: string;
  role: "participant" | "clinician" | "director" | "admin";
}

export interface AuthResult {
  user_id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  session_id?: string;
}

export interface ConsentItem {
  scope: string;
  granted: boolean;
  updated_at: string;
}

export interface GateStep {
  gate_number: number;
  gate_name: string;
  status: string; // "PASSED" | "BYPASS_EMERGENCY" | "BLOCKED_NO_CONSENT" | "FLAGGED" | "HOLD_PENDING_CLINICIAN" | "RELEASED_DIRECT"
  category: "RECORDED_OBSERVATION" | "CALCULATED_MATH" | "TEMPLATE_EXPLANATION";
  details: Record<string, any>;
}

export interface SessionPoint {
  session_id: string;
  session_number: number;
  is_practice: boolean;
  completed_at: string;
  scores: Record<string, number>;
  robust_z: Record<string, number | null>;
  cusum_s: Record<string, number>;
  context_affected: boolean;
  function_worse: boolean;
  triage_color: string;
}

export interface UserTrendResponse {
  user: {
    id: string;
    name: string;
    age: number;
    sex: string;
    language: string;
    education_band: string;
  };
  baselines: Record<
    string,
    {
      median: number;
      sd: number;
      sample_sd: number;
      lower_1_5: number;
      upper_1_5: number;
    }
  >;
  sessions: SessionPoint[];
}

export interface RiskFactorItem {
  id: string;
  points: number;
  name_en: string;
  name_ar: string;
  category: string;
}

export interface UserRiskResponse {
  points: number;
  tier: "low" | "moderate" | "high";
  repeat_days: number;
  factors: RiskFactorItem[];
}

export interface ParticipantResultResponse {
  status: "pending_clinician_review" | "released";
  color?: string;
  urgent_emergency: boolean;
  confidence?: string;
  summary_en?: string;
  summary_ar?: string;
  actions_en?: string[];
  actions_ar?: string[];
  repeat_days?: number;
  clinician_note?: string;
  attending_clinician_id?: string;
  attending_clinician_name?: string;
  message_en?: string;
  message_ar?: string;
  agent_trace: GateStep[];
}

export interface ReviewQueueItem {
  triage_id: string;
  user_id: string;
  user_name: string;
  attending_clinician_id?: string;
  attending_clinician_name?: string;
  age: number;
  language: string;
  session_number: number;
  triage_color: string;
  reasons: string[];
  confidence: string;
  created_at: string;
  trend: UserTrendResponse;
  risk_profile: UserRiskResponse;
  reversible_causes: Array<{ id: string; en: string; ar: string }>;
  agent_trace: GateStep[];
  context_intake?: {
    sleep_hours: number;
    mood_positive: boolean;
    illness: boolean;
    new_medication: boolean;
    pain: boolean;
    distraction: boolean;
    red_flags: Record<string, any>;
  };
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error ${res.status}: ${errText}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`Fetch failed for ${url}:`, err);
    throw err;
  }
}

export const api = {
  health: () => fetchApi<{ status: string; version: string }>("/api/health"),
  getUsers: () => fetchApi<UserSummary[]>("/api/users"),
  getClinicians: () => fetchApi<ClinicianSummary[]>("/api/admin/clinicians"),
  overrideRelease: (payload: AdminOverridePayload) =>
    fetchApi<{ status: string; message: string }>("/api/admin/override/release", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: AuthLoginPayload) =>
    fetchApi<AuthResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendAuthCode: (payload: AuthSendCodePayload) =>
    fetchApi<{ status: string; message: string; email: string; is_registered: boolean }>("/api/auth/send-code", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyAuthCode: (payload: AuthVerifyPayload) =>
    fetchApi<AuthResult>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  onboardPatient: (payload: PatientOnboardPayload) =>
    fetchApi<PatientOnboardResult>("/api/patients/onboard", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getConsent: (userId: string) => fetchApi<ConsentItem[]>(`/api/users/${userId}/consent`),
  updateConsent: (userId: string, scope: string, granted: boolean, actor: string = "user") =>
    fetchApi<{ status: string }>("/api/consent", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, scope, granted, actor }),
    }),
  initSession: (userId: string, device: string = "web_browser") =>
    fetchApi<{
      session_id: string;
      session_number: number;
      form_version: string;
      is_practice: boolean;
    }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, device }),
    }),
  submitSessionResults: (sessionId: string, payload: any) =>
    fetchApi<{
      session_id: string;
      triage_color: string;
      held_for_review: boolean;
      agent_trace: GateStep[];
    }>(`/api/sessions/${sessionId}/results`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  importFhir: (userId: string, factors: string[], bundleType: string = "malaffi_wearable") =>
    fetchApi<{
      status: string;
      new_points: number;
      new_tier: string;
      repeat_days: number;
      factors: string[];
    }>("/api/import/fhir", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, factors, bundle_type: bundleType }),
    }),
  getUserTrend: (userId: string) => fetchApi<UserTrendResponse>(`/api/users/${userId}/trend`),
  getUserRisk: (userId: string) => fetchApi<UserRiskResponse>(`/api/users/${userId}/risk`),
  getUserResult: (userId: string) => fetchApi<ParticipantResultResponse>(`/api/users/${userId}/result`),
  getReviewQueue: () => fetchApi<ReviewQueueItem[]>("/api/review/queue"),
  submitReviewDecision: (
    triageId: string,
    decision: "approve" | "edit" | "escalate",
    note: string,
    checkedCauses: string[],
    clinicianId: string = "dr_nour_neurology",
    referralDestination?: string
  ) =>
    fetchApi<{ status: string; decision: string }>(`/api/review/${triageId}/decision`, {
      method: "POST",
      body: JSON.stringify({
        clinician_id: clinicianId,
        decision,
        note,
        checked_causes: checkedCauses,
        referral_destination: referralDestination,
      }),
    }),
  assignClinician: (clinicianId: string, patientId: string) =>
    fetchApi<{ status: string; clinician_name: string; message: string }>("/api/clinician/assign", {
      method: "POST",
      body: JSON.stringify({ clinician_id: clinicianId, patient_id: patientId }),
    }),
  submitContextIntake: (payload: {
    user_id: string;
    sleep_hours: number;
    mood_positive: boolean;
    illness: boolean;
    new_medication: boolean;
    pain: boolean;
    distraction: boolean;
    sensory_strain: boolean;
    recent_stress_event: boolean;
    patient_notes?: string;
  }) =>
    fetchApi<{ status: string; message_en: string; message_ar: string }>("/api/patient/context-intake", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  checkinPatientAtReception: (payload: {
    name: string;
    email?: string;
    emirates_id_or_mrn: string;
    insurance_provider: string;
    copay_status: string;
    department: string;
    attending_clinician_id: string;
    age: number;
    sex: "F" | "M";
    language: "en" | "ar";
    education_band: "low" | "mid" | "high";
    receptionist_id?: string;
    chief_complaint?: string;
    triage_priority?: "routine" | "urgent" | "fast_track";
  }) =>
    fetchApi<{
      status: string;
      user_id: string;
      mrn: string;
      patient_name: string;
      attending_clinician_id: string;
      attending_clinician_name: string;
      session_id: string;
      message: string;
    }>("/api/reception/checkin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getReceptionRegisteredPatients: (receptionistId?: string) =>
    fetchApi<
      Array<{
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
      }>
    >(`/api/reception/registered-patients${receptionistId ? `?receptionist_id=${encodeURIComponent(receptionistId)}` : ""}`),
  getAuditLogs: () => fetchApi<AuditLogEntry[]>("/api/admin/audit"),
  getBenchmark: () => fetchApi<any>("/api/admin/benchmark"),
  createIAMUser: (payload: IAMUserCreatePayload) =>
    fetchApi<UserSummary>("/api/admin/iam/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateIAMUser: (
    userId: string,
    payload: {
      name?: string;
      email?: string;
      role?: string;
      is_active?: boolean;
      password?: string;
      admin_actor?: string;
    }
  ) =>
    fetchApi<UserSummary>(`/api/admin/iam/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteUser: (userId: string, hardDelete: boolean = true, adminActor: string = "admin@doh.gov.ae") =>
    fetchApi<{ status: string; message: string }>(
      `/api/admin/iam/users/${userId}?hard_delete=${hardDelete}&admin_actor=${encodeURIComponent(adminActor)}`,
      {
        method: "DELETE",
      }
    ),
};
