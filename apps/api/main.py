"""BrainBaseline FastAPI Application.

Production REST backend implementing the 5-Gate Clinical Architecture,
audit logging, clinician review queue, and longitudinal trend analytics.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .database import engine, init_db, get_session
from .models import (
    User,
    Consent,
    SessionRecord,
    TaskResult,
    ContextCheckin,
    FunctionReport,
    RiskProfile,
    Finding,
    Triage,
    Review,
    AuditLog,
    UserSummary,
    ConsentItem,
    ConsentUpdateBody,
    SessionInitBody,
    SessionInitResponse,
    SessionResultSubmission,
    SessionSubmissionResponse,
    GateStep,
    FHIRImportBody,
    FHIRImportResponse,
    SessionPoint,
    UserTrendResponse,
    UserRiskResponse,
    RiskFactorItemSchema,
    ParticipantResultResponse,
    ReviewQueueItem,
    ReviewDecisionBody,
    ReviewDecisionResponse,
    AuditLogEntry,
)
from .orchestrator import run_orchestrator
from .seed import seed_demo_data
from packages.engine.risk_tier import compute_risk_tier
from packages.engine.baseline import compute_baseline, DEFAULT_POP_PARAMS
from packages.explain.templates import (
    generate_participant_summary,
    select_tailored_actions,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB and seed demo personas
    init_db()
    with Session(engine) as session:
        seed_demo_data(session)
    yield


app = FastAPI(
    title="BrainBaseline API",
    version="1.0.0",
    description="Longitudinal Within-Person Baseline Cognitive Health Screening Platform",
    lifespan=lifespan,
)

# CORS configuration allowing cross-origin requests from any host
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------
# 1. Health
# ----------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}


# ----------------------------------------------------
# 2. Users List & Persona Switcher
# ----------------------------------------------------
@app.get("/api/users", response_model=List[UserSummary])
def list_users(db: Session = Depends(get_session)):
    users = db.exec(select(User)).all()
    summaries = []
    for u in users:
        # Get latest triage
        latest_triage = (
            db.exec(
                select(Triage)
                .where(Triage.user_id == u.id)
                .order_by(Triage.created_at.desc())  # type: ignore
            ).first()
        )
        color = latest_triage.color if latest_triage else "baseline"
        pending = bool(latest_triage and latest_triage.held_for_review)

        # Check if already released
        if pending and latest_triage:
            rev = db.exec(select(Review).where(Review.triage_id == latest_triage.id)).first()
            if rev and rev.released_at is not None:
                pending = False

        summaries.append(
            UserSummary(
                id=u.id,
                name=u.name,
                age=u.age,
                sex=u.sex,
                language=u.language,
                education_band=u.education_band,
                latest_triage_color=color,
                pending_review=pending,
            )
        )
    return summaries


# ----------------------------------------------------
# 3. Consent Management & Live Revocation
# ----------------------------------------------------
@app.get("/api/users/{user_id}/consent", response_model=List[ConsentItem])
def get_user_consent(user_id: str, db: Session = Depends(get_session)):
    consents = db.exec(select(Consent).where(Consent.user_id == user_id)).all()
    return [
        ConsentItem(scope=c.scope, granted=c.granted, updated_at=c.updated_at)
        for c in consents
    ]


@app.post("/api/consent")
def update_consent(body: ConsentUpdateBody, db: Session = Depends(get_session)):
    consent = db.exec(
        select(Consent).where(Consent.user_id == body.user_id, Consent.scope == body.scope)
    ).first()
    if not consent:
        consent = Consent(
            user_id=body.user_id,
            scope=body.scope,
            granted=body.granted,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(consent)
    else:
        consent.granted = body.granted
        consent.updated_at = datetime.now(timezone.utc)

    # Log to audit log
    db.add(
        AuditLog(
            actor=body.actor,
            action="CONSENT_UPDATED",
            target_type="consent",
            target_id=f"{body.user_id}:{body.scope}",
            details_json=json.dumps({"granted": body.granted}),
        )
    )
    db.commit()
    return {"status": "ok", "user_id": body.user_id, "scope": body.scope, "granted": body.granted}


# ----------------------------------------------------
# 4. Session Initialization
# ----------------------------------------------------
@app.post("/api/sessions", response_model=SessionInitResponse)
def initialize_session(body: SessionInitBody, db: Session = Depends(get_session)):
    user = db.get(User, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing_sessions = db.exec(
        select(SessionRecord).where(SessionRecord.user_id == body.user_id)
    ).all()
    next_num = len(existing_sessions) + 1
    form_ver = ["A", "B", "C", "D"][(next_num - 1) % 4]
    is_practice = next_num == 1
    session_id = f"sess_{body.user_id}_{next_num}_{int(datetime.now(timezone.utc).timestamp())}"

    sess = SessionRecord(
        id=session_id,
        user_id=body.user_id,
        session_number=next_num,
        form_version=form_ver,
        is_practice=is_practice,
        device=body.device,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(sess)
    db.commit()

    return SessionInitResponse(
        session_id=session_id,
        session_number=next_num,
        form_version=form_ver,
        is_practice=is_practice,
    )


# ----------------------------------------------------
# 5. Session Results Submission (Runs 5-Gate Orchestrator)
# ----------------------------------------------------
@app.post("/api/sessions/{session_id}/results", response_model=SessionSubmissionResponse)
def submit_session_results(
    session_id: str,
    submission: SessionResultSubmission,
    db: Session = Depends(get_session),
):
    sess = db.get(SessionRecord, session_id)
    if not sess:
        # Create session record if not pre-initialized
        existing_count = len(
            db.exec(select(SessionRecord).where(SessionRecord.user_id == submission.user_id)).all()
        )
        sess = SessionRecord(
            id=session_id,
            user_id=submission.user_id,
            session_number=existing_count + 1,
            form_version="A",
            is_practice=(existing_count == 0),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(sess)
        db.commit()

    # Record Task Results
    for dom, sc in submission.scores.items():
        db.add(
            TaskResult(
                session_id=session_id,
                domain=dom,
                raw_score=sc,
                sub_metrics_json=json.dumps(submission.sub_metrics),
                completed_at=datetime.now(timezone.utc),
            )
        )
    db.commit()

    try:
        triage_res, agent_trace = run_orchestrator(session_id, submission, db)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))

    return SessionSubmissionResponse(
        session_id=session_id,
        triage_color=triage_res.color,
        held_for_review=triage_res.held_for_review,
        agent_trace=agent_trace,
    )


# ----------------------------------------------------
# 6. Malaffi / FHIR Wearable Import
# ----------------------------------------------------
@app.post("/api/import/fhir", response_model=FHIRImportResponse)
def import_fhir_bundle(body: FHIRImportBody, db: Session = Depends(get_session)):
    user = db.get(User, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ingest factors
    prof = db.exec(select(RiskProfile).where(RiskProfile.user_id == body.user_id)).first()
    current_factors = json.loads(prof.factors_json) if prof else []
    merged_factors = list(set(current_factors + body.factors))

    calc = compute_risk_tier(merged_factors)

    if not prof:
        prof = RiskProfile(
            user_id=body.user_id,
            factors_json=json.dumps(merged_factors),
            total_points=calc.points,
            tier=calc.tier,
            repeat_days=calc.repeat_days,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(prof)
    else:
        prof.factors_json = json.dumps(merged_factors)
        prof.total_points = calc.points
        prof.tier = calc.tier
        prof.repeat_days = calc.repeat_days
        prof.updated_at = datetime.now(timezone.utc)

    db.add(
        AuditLog(
            actor="malaffi_fhir_bridge",
            action="FHIR_BUNDLE_INGESTED",
            target_type="user",
            target_id=body.user_id,
            details_json=json.dumps({"bundle_type": body.bundle_type, "added_factors": body.factors}),
        )
    )
    db.commit()

    return FHIRImportResponse(
        status="success",
        user_id=body.user_id,
        new_points=calc.points,
        new_tier=calc.tier,
        repeat_days=calc.repeat_days,
        factors=merged_factors,
    )


# ----------------------------------------------------
# 7. Longitudinal Trend Trajectory
# ----------------------------------------------------
@app.get("/api/users/{user_id}/trend", response_model=UserTrendResponse)
def get_user_trend(user_id: str, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sessions = (
        db.exec(
            select(SessionRecord)
            .where(SessionRecord.user_id == user_id)
            .order_by(SessionRecord.session_number)  # type: ignore
        ).all()
    )

    baseline_sessions = [s for s in sessions if s.session_number in [2, 3, 4]]
    baselines_out = {}
    if len(baseline_sessions) >= 3:
        for dom in ["memory", "sequence_av", "attention_rt"]:
            scores = []
            for bs in baseline_sessions:
                tr = db.exec(
                    select(TaskResult).where(TaskResult.session_id == bs.id, TaskResult.domain == dom)
                ).first()
                if tr:
                    scores.append(tr.raw_score)
            b = compute_baseline(dom, scores, pop_sd=DEFAULT_POP_PARAMS[dom]["pop_sd"])
            baselines_out[dom] = {
                "median": b.median,
                "sd": b.sd,
                "sample_sd": b.sample_sd,
                "lower_1_5": round(b.median - 1.5 * b.sd, 2),
                "upper_1_5": round(b.median + 1.5 * b.sd, 2),
            }

    session_points: List[SessionPoint] = []
    for s in sessions:
        task_res = db.exec(select(TaskResult).where(TaskResult.session_id == s.id)).all()
        scores = {tr.domain: tr.raw_score for tr in task_res}

        findings = db.exec(select(Finding).where(Finding.session_id == s.id)).all()
        robust_z = {f.domain: f.robust_z for f in findings}
        cusum_s = {f.domain: f.cusum_s for f in findings}

        ctx = db.exec(select(ContextCheckin).where(ContextCheckin.session_id == s.id)).first()
        is_ctx = bool(ctx and (ctx.sleep_hours < 5.0 or ctx.mood_positive or ctx.illness or ctx.new_medication))

        f_rep = db.exec(select(FunctionReport).where(FunctionReport.session_id == s.id)).first()
        f_worse = bool(f_rep and f_rep.function_worse)

        triage = db.exec(select(Triage).where(Triage.session_id == s.id)).first()
        color = triage.color if triage else ("baseline" if s.session_number < 5 else "green")

        session_points.append(
            SessionPoint(
                session_id=s.id,
                session_number=s.session_number,
                is_practice=s.is_practice,
                completed_at=s.completed_at.isoformat(),
                scores=scores,
                robust_z=robust_z,
                cusum_s=cusum_s,
                context_affected=is_ctx,
                function_worse=f_worse,
                triage_color=color,
            )
        )

    return UserTrendResponse(
        user={
            "id": user.id,
            "name": user.name,
            "age": user.age,
            "sex": user.sex,
            "language": user.language,
            "education_band": user.education_band,
        },
        baselines=baselines_out,
        sessions=session_points,
    )


# ----------------------------------------------------
# 8. Modifiable Risk Profile
# ----------------------------------------------------
@app.get("/api/users/{user_id}/risk", response_model=UserRiskResponse)
def get_user_risk(user_id: str, db: Session = Depends(get_session)):
    prof = db.exec(select(RiskProfile).where(RiskProfile.user_id == user_id)).first()
    factors = json.loads(prof.factors_json) if prof else []
    calc = compute_risk_tier(factors)
    return UserRiskResponse(
        points=calc.points,
        tier=calc.tier,
        repeat_days=calc.repeat_days,
        factors=[
            RiskFactorItemSchema(
                id=f.id,
                points=f.points,
                name_en=f.name_en,
                name_ar=f.name_ar,
                category=f.category,
            )
            for f in calc.factors
        ],
    )


# ----------------------------------------------------
# 9. Participant Plan & Result (Enforces Gate 5 Clinician Hold)
# ----------------------------------------------------
@app.get("/api/users/{user_id}/result", response_model=ParticipantResultResponse)
def get_user_result(user_id: str, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get latest triage
    latest_triage = (
        db.exec(
            select(Triage)
            .where(Triage.user_id == user_id)
            .order_by(Triage.created_at.desc())  # type: ignore
        ).first()
    )

    if not latest_triage:
        return ParticipantResultResponse(
            status="released",
            color="baseline",
            confidence="medium",
            message_en="No checks completed yet.",
            message_ar="لم يتم إكمال أي فحص حتى الآن.",
        )

    # Check Gate 5 Clinician Hold
    if latest_triage.held_for_review:
        review = db.exec(select(Review).where(Review.triage_id == latest_triage.id)).first()
        if not review or review.released_at is None:
            # GATE 5 ACTIVE: Calm holding state; NEVER expose Orange/Red label to participant
            return ParticipantResultResponse(
                status="pending_clinician_review",
                message_en="Your check is complete. A clinician is reviewing your longitudinal trend and will share your personalized plan shortly.",
                message_ar="اكتمل فحصك بنجاح. يقوم الطبيب المختص بمراجعة مؤشراتك الطولية وسيشارك خطتك الشخصية قريباً.",
                agent_trace=[
                    GateStep(
                        gate_number=5,
                        gate_name="Clinician Hold Gate",
                        status="HOLD_PENDING_CLINICIAN",
                        category="RECORDED_OBSERVATION",
                        details={"message": "Report held in clinician queue for reversible etiology verification."},
                    )
                ],
            )

    # Released or Direct
    review = db.exec(select(Review).where(Review.triage_id == latest_triage.id)).first()
    clinician_note = review.note if review else None

    # Get user risk triggers for lifestyle actions
    prof = db.exec(select(RiskProfile).where(RiskProfile.user_id == user_id)).first()
    triggers = json.loads(prof.factors_json) if prof else []

    summary_en = generate_participant_summary(
        color=latest_triage.color,
        urgent_emergency=latest_triage.urgent_emergency,
        lang="en",
    )
    summary_ar = generate_participant_summary(
        color=latest_triage.color,
        urgent_emergency=latest_triage.urgent_emergency,
        lang="ar",
    )

    actions_en = select_tailored_actions(triggers, lang="en")
    actions_ar = select_tailored_actions(triggers, lang="ar")

    return ParticipantResultResponse(
        status="released",
        color=latest_triage.color,
        urgent_emergency=latest_triage.urgent_emergency,
        confidence=latest_triage.confidence,
        summary_en=summary_en,
        summary_ar=summary_ar,
        actions_en=actions_en,
        actions_ar=actions_ar,
        repeat_days=latest_triage.repeat_days,
        clinician_note=clinician_note,
    )


# ----------------------------------------------------
# 10. Clinician Review Queue & Decision Console
# ----------------------------------------------------
@app.get("/api/review/queue", response_model=List[ReviewQueueItem])
def get_review_queue(db: Session = Depends(get_session)):
    # Find all reviews that are pending release (released_at is None)
    pending_reviews = (
        db.exec(
            select(Review)
            .where(Review.released_at == None)  # noqa: E711
            .order_by(Review.created_at.desc())  # type: ignore
        ).all()
    )

    rules_path = Path("data/triage_rules.json")
    reversible_causes = []
    if rules_path.exists():
        try:
            with open(rules_path, "r", encoding="utf-8") as f:
                reversible_causes = json.load(f).get("reversible_causes", [])
        except Exception:
            pass

    queue_items = []
    for rev in pending_reviews:
        triage = db.get(Triage, rev.triage_id)
        if not triage:
            continue
        user = db.get(User, rev.user_id)
        if not user:
            continue
        sess = db.get(SessionRecord, triage.session_id)
        sess_num = sess.session_number if sess else 1

        trend = get_user_trend(user.id, db)
        risk = get_user_risk(user.id, db)

        queue_items.append(
            ReviewQueueItem(
                triage_id=triage.id,
                user_id=user.id,
                user_name=user.name,
                age=user.age,
                language=user.language,
                session_number=sess_num,
                triage_color=triage.color,
                reasons=json.loads(triage.reasons_json),
                confidence=triage.confidence,
                created_at=triage.created_at,
                trend=trend,
                risk_profile=risk,
                reversible_causes=reversible_causes,
                agent_trace=[
                    GateStep(
                        gate_number=5,
                        gate_name="Clinician Review Queue",
                        status="PENDING_DECISION",
                        category="RECORDED_OBSERVATION",
                        details={"flagged_domains": json.loads(triage.domains_flagged_json)},
                    )
                ],
            )
        )
    return queue_items


@app.post("/api/review/{triage_id}/decision", response_model=ReviewDecisionResponse)
def submit_review_decision(
    triage_id: str,
    body: ReviewDecisionBody,
    db: Session = Depends(get_session),
):
    rev = db.exec(select(Review).where(Review.triage_id == triage_id)).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Review entry not found")

    rev.clinician_id = body.clinician_id
    rev.decision = body.decision
    rev.note = body.note
    rev.checked_causes_json = json.dumps(body.checked_causes)
    rev.referral_destination = body.referral_destination
    rev.released_at = datetime.now(timezone.utc)

    # Log to audit log
    db.add(
        AuditLog(
            actor=body.clinician_id,
            action=f"CLINICIAN_PLAN_{body.decision.upper()}",
            target_type="triage",
            target_id=triage_id,
            details_json=json.dumps({
                "decision": body.decision,
                "checked_causes": body.checked_causes,
                "referral_destination": body.referral_destination,
            }),
        )
    )
    db.commit()

    return ReviewDecisionResponse(
        status="released",
        triage_id=triage_id,
        released_at=rev.released_at,
        decision=body.decision,
    )


# ----------------------------------------------------
# 11. Admin Audit Log & Benchmark Viewer
# ----------------------------------------------------
@app.get("/api/admin/audit", response_model=List[AuditLogEntry])
def get_audit_logs(db: Session = Depends(get_session)):
    logs = (
        db.exec(
            select(AuditLog)
            .order_by(AuditLog.timestamp.desc())  # type: ignore
            .limit(100)
        ).all()
    )
    return [
        AuditLogEntry(
            id=l.id or 0,
            timestamp=l.timestamp,
            actor=l.actor,
            action=l.action,
            target_type=l.target_type,
            target_id=l.target_id,
            details=json.loads(l.details_json) if l.details_json else {},
        )
        for l in logs
    ]


@app.get("/api/admin/benchmark")
def get_benchmark_report():
    report_path = Path("sim/report.json")
    if not report_path.exists():
        # Fallback to sim runner if not found
        from sim.run_benchmark import run_benchmark
        return run_benchmark()

    with open(report_path, "r", encoding="utf-8") as f:
        return json.load(f)
