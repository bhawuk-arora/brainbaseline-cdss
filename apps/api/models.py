"""SQLModel database models and Pydantic request/response schemas."""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from pydantic import BaseModel


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ==========================================
# 11 SQLModel Database Tables
# ==========================================

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(primary_key=True)
    name: str
    email: Optional[str] = Field(default=None, index=True)
    age: int
    sex: str  # "F" | "M"
    language: str  # "en" | "ar"
    education_band: str  # "low" | "mid" | "high"
    created_at: datetime = Field(default_factory=get_utc_now)


class Consent(SQLModel, table=True):
    __tablename__ = "consents"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    scope: str  # e.g. "cognition", "malaffi_fhir", "research"
    granted: bool = Field(default=True)
    updated_at: datetime = Field(default_factory=get_utc_now)


class SessionRecord(SQLModel, table=True):
    __tablename__ = "session_records"
    id: str = Field(primary_key=True)  # e.g. "sess_layla_1"
    user_id: str = Field(index=True)
    session_number: int
    form_version: str  # "A" | "B" | "C" | "D"
    is_practice: bool = Field(default=False)
    device: str = Field(default="browser")
    completed_at: datetime = Field(default_factory=get_utc_now)


class TaskResult(SQLModel, table=True):
    __tablename__ = "task_results"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    domain: str  # "memory" | "sequence_av" | "attention_rt"
    raw_score: float
    sub_metrics_json: str = Field(default="{}")  # json of visual_acc, auditory_acc, median_rt_ms, etc.
    completed_at: datetime = Field(default_factory=get_utc_now)


class ContextCheckin(SQLModel, table=True):
    __tablename__ = "context_checkins"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    sleep_hours: float
    mood_positive: bool
    illness: bool
    new_medication: bool
    pain: bool = Field(default=False)
    distraction: bool = Field(default=False)
    red_flags_json: str = Field(default="{}")
    recorded_at: datetime = Field(default_factory=get_utc_now)


class FunctionReport(SQLModel, table=True):
    __tablename__ = "function_reports"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    user_id: str = Field(index=True)
    reporter_type: str = Field(default="self")  # "self" | "informant"
    items_json: str = Field(default="[]")
    total_score: int = Field(default=0)
    function_worse: bool = Field(default=False)
    recorded_at: datetime = Field(default_factory=get_utc_now)


class RiskProfile(SQLModel, table=True):
    __tablename__ = "risk_profiles"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, unique=True)
    factors_json: str = Field(default="[]")  # list of active factor string keys
    total_points: int = Field(default=0)
    tier: str = Field(default="low")  # "low" | "moderate" | "high"
    repeat_days: int = Field(default=365)
    updated_at: datetime = Field(default_factory=get_utc_now)


class Finding(SQLModel, table=True):
    __tablename__ = "findings"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    domain: str
    robust_z: Optional[float] = None
    rci: Optional[float] = None
    reliable_decline: bool = Field(default=False)
    cusum_s: float = Field(default=0.0)
    drift_alarm: bool = Field(default=False)
    below_safety_floor: bool = Field(default=False)


class Triage(SQLModel, table=True):
    __tablename__ = "triages"
    id: str = Field(primary_key=True)  # e.g. "triage_layla_6"
    session_id: str = Field(index=True)
    user_id: str = Field(index=True)
    color: str  # "baseline" | "green" | "yellow" | "orange" | "red"
    urgent_emergency: bool = Field(default=False)
    held_for_review: bool = Field(default=False)
    reasons_json: str = Field(default="[]")
    domains_flagged_json: str = Field(default="[]")
    confidence: str = Field(default="high")  # "high" | "medium" | "low"
    repeat_days: int = Field(default=90)
    created_at: datetime = Field(default_factory=get_utc_now)


class Review(SQLModel, table=True):
    __tablename__ = "reviews"
    id: Optional[int] = Field(default=None, primary_key=True)
    triage_id: str = Field(index=True, unique=True)
    user_id: str = Field(index=True)
    clinician_id: Optional[str] = None
    decision: Optional[str] = None  # "approve" | "edit" | "escalate"
    note: Optional[str] = None
    checked_causes_json: str = Field(default="[]")
    referral_destination: Optional[str] = None
    released_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=get_utc_now)
    actor: str  # e.g. "user", "clinician_dr_fatima", "system_orchestrator"
    action: str  # e.g. "CONSENT_REVOKED", "TRIAGE_COMPLETED", "PLAN_RELEASED"
    target_type: str  # "user", "session", "triage", "consent"
    target_id: str
    details_json: str = Field(default="{}")


# ==========================================
# Pydantic Request & Response Schemas
# ==========================================

class PatientOnboardRequest(BaseModel):
    name: str
    email: Optional[str] = None
    age: int
    sex: str = "F"  # "F" | "M"
    language: str = "en"  # "en" | "ar"
    education_band: str = "mid"  # "low" | "mid" | "high"
    phone_or_mrn: Optional[str] = None
    consent_cognition: bool = True
    consent_ehr: bool = True
    risk_factors: List[str] = []  # e.g. ["hypertension", "sleep_apnea", "family_history", "apoe4_carrier"]


class PatientOnboardResponse(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    message: str
    session_id: str
    session_number: int


class AuthEmailRequest(BaseModel):
    email: str
    role: str = "participant"  # "participant" | "clinician" | "admin"


class AuthVerifyRequest(BaseModel):
    email: str
    code: str
    role: str = "participant"


class AuthResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    token: str
    session_id: Optional[str] = None


class UserSummary(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    age: int
    sex: str
    language: str
    education_band: str
    latest_triage_color: str
    pending_review: bool


class ConsentItem(BaseModel):
    scope: str
    granted: bool
    updated_at: datetime


class ConsentUpdateBody(BaseModel):
    user_id: str
    scope: str
    granted: bool
    actor: str = "user"


class SessionInitBody(BaseModel):
    user_id: str
    device: str = "desktop_chrome"


class SessionInitResponse(BaseModel):
    session_id: str
    session_number: int
    form_version: str
    is_practice: bool


class ContextCheckinData(BaseModel):
    sleep_hours: float = 7.0
    mood_positive: bool = False
    illness: bool = False
    new_medication: bool = False
    pain: bool = False
    distraction: bool = False


class RedFlagData(BaseModel):
    sudden_confusion: bool = False
    speech_trouble: bool = False
    new_weakness: bool = False
    recent_fall_head_injury: bool = False


class SessionResultSubmission(BaseModel):
    user_id: str
    scores: Dict[str, float]
    sub_metrics: Dict[str, Any] = {}
    context: ContextCheckinData = ContextCheckinData()
    red_flags: RedFlagData = RedFlagData()
    function_items: List[int] = [0] * 8


class GateStep(BaseModel):
    gate_number: int
    gate_name: str
    status: str  # "PASSED" | "BYPASS_EMERGENCY" | "BLOCKED_NO_CONSENT" | "FLAGGED"
    category: str  # "RECORDED_OBSERVATION" | "CALCULATED_MATH" | "TEMPLATE_EXPLANATION"
    details: Dict[str, Any]


class SessionSubmissionResponse(BaseModel):
    session_id: str
    triage_color: str
    held_for_review: bool
    agent_trace: List[GateStep]


class FHIRImportBody(BaseModel):
    user_id: str
    bundle_type: str  # "malaffi_wearable" | "clinical_risk"
    factors: List[str]


class FHIRImportResponse(BaseModel):
    status: str
    user_id: str
    new_points: int
    new_tier: str
    repeat_days: int
    factors: List[str]


class SessionPoint(BaseModel):
    session_id: str
    session_number: int
    is_practice: bool
    completed_at: str
    scores: Dict[str, float]
    robust_z: Dict[str, Optional[float]]
    cusum_s: Dict[str, float]
    context_affected: bool
    function_worse: bool
    triage_color: str


class UserTrendResponse(BaseModel):
    user: Dict[str, Any]
    baselines: Dict[str, Any]
    sessions: List[SessionPoint]


class RiskFactorItemSchema(BaseModel):
    id: str
    points: int
    name_en: str
    name_ar: str
    category: str


class UserRiskResponse(BaseModel):
    points: int
    tier: str
    repeat_days: int
    factors: List[RiskFactorItemSchema]


class ParticipantResultResponse(BaseModel):
    status: str  # "pending_clinician_review" | "released"
    color: Optional[str] = None
    urgent_emergency: bool = False
    confidence: Optional[str] = None
    summary_en: Optional[str] = None
    summary_ar: Optional[str] = None
    actions_en: Optional[List[str]] = None
    actions_ar: Optional[List[str]] = None
    repeat_days: Optional[int] = None
    clinician_note: Optional[str] = None
    message_en: Optional[str] = None
    message_ar: Optional[str] = None
    agent_trace: List[GateStep] = []


class ReviewQueueItem(BaseModel):
    triage_id: str
    user_id: str
    user_name: str
    age: int
    language: str
    session_number: int
    triage_color: str
    reasons: List[str]
    confidence: str
    created_at: datetime
    trend: UserTrendResponse
    risk_profile: UserRiskResponse
    reversible_causes: List[Dict[str, str]]
    agent_trace: List[GateStep]


class ReviewDecisionBody(BaseModel):
    clinician_id: str
    decision: str  # "approve" | "edit" | "escalate"
    note: str
    checked_causes: List[str] = []
    referral_destination: Optional[str] = None


class ReviewDecisionResponse(BaseModel):
    status: str
    triage_id: str
    released_at: datetime
    decision: str


class AuditLogEntry(BaseModel):
    id: int
    timestamp: datetime
    actor: str
    action: str
    target_type: str
    target_id: str
    details: Dict[str, Any]
