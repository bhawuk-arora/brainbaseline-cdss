"""Five-Gate Agentic Orchestrator.

Orchestrates:
Gate 1 (Consent) -> Gate 2 (Red-Flag Emergency Bypass) ->
Gate 3 (Context & Confidence) -> Gate 4 (Deterministic Engine & Triage) ->
Gate 5 (Clinician Hold & Release Gate).
"""

import json
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlmodel import Session, select

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
    GateStep,
    SessionResultSubmission,
)
from packages.engine.baseline import compute_baseline, DEFAULT_POP_PARAMS
from packages.engine.scoring import (
    compute_robust_z,
    compute_rci,
    update_cusum,
    DomainScoreResult,
)
from packages.engine.context import evaluate_context, evaluate_confidence, ContextCheckinInput, RedFlagInput
from packages.engine.triage import evaluate_triage, TriageResult
from packages.engine.risk_tier import compute_risk_tier
from packages.explain.templates import (
    generate_participant_summary,
    generate_clinician_summary,
    select_tailored_actions,
)


def run_orchestrator(
    session_id: str,
    submission: SessionResultSubmission,
    db: Session,
) -> Tuple[TriageResult, List[GateStep]]:
    """
    Executes the 5-Gate pipeline, records all findings, triages, reviews, and logs audit events.
    Returns (triage_result, agent_trace).
    """
    agent_trace: List[GateStep] = []
    user_id = submission.user_id

    # ----------------------------------------------------
    # GATE 1: Consent Gate
    # ----------------------------------------------------
    consent = db.exec(
        select(Consent).where(Consent.user_id == user_id, Consent.scope == "cognition")
    ).first()

    if not consent or not consent.granted:
        gate_1_step = GateStep(
            gate_number=1,
            gate_name="Consent Gate",
            status="BLOCKED_NO_CONSENT",
            category="RECORDED_OBSERVATION",
            details={
                "scope": "cognition",
                "has_consent": bool(consent),
                "granted": bool(consent.granted) if consent else False,
                "message": "User consent missing or revoked for cognitive screening.",
            },
        )
        agent_trace.append(gate_1_step)
        # Log to audit log
        db.add(
            AuditLog(
                actor=user_id,
                action="BLOCKED_NO_CONSENT",
                target_type="session",
                target_id=session_id,
                details_json=json.dumps({"reason": "Consent missing or revoked"}),
            )
        )
        db.commit()
        raise PermissionError("Consent missing or revoked for scope 'cognition'")

    agent_trace.append(
        GateStep(
            gate_number=1,
            gate_name="Consent Gate",
            status="PASSED",
            category="RECORDED_OBSERVATION",
            details={
                "scope": "cognition",
                "granted": True,
                "updated_at": consent.updated_at.isoformat(),
            },
        )
    )

    # ----------------------------------------------------
    # GATE 2: Red-Flag Emergency Bypass Gate
    # ----------------------------------------------------
    rf_input = RedFlagInput(**submission.red_flags.model_dump())
    has_red_flags = rf_input.any_flag()

    if has_red_flags:
        rf_details = {k: v for k, v in submission.red_flags.model_dump().items() if v}
        gate_2_step = GateStep(
            gate_number=2,
            gate_name="Red-Flag Emergency Gate",
            status="BYPASS_EMERGENCY",
            category="RECORDED_OBSERVATION",
            details={
                "acute_red_flags": rf_details,
                "action": "Immediate 999/Emergency triage bypass without cognitive scoring",
            },
        )
        agent_trace.append(gate_2_step)

        triage_res = evaluate_triage(
            domain_results={},
            has_valid_baseline=True,
            context_affected=False,
            function_worse=False,
            urgent_emergency=True,
        )

        # Persist triage
        triage_id = f"triage_{session_id}"
        existing_triage = db.get(Triage, triage_id)
        if not existing_triage:
            db_triage = Triage(
                id=triage_id,
                session_id=session_id,
                user_id=user_id,
                color="red",
                urgent_emergency=True,
                held_for_review=False,
                reasons_json=json.dumps(triage_res.reasons),
                domains_flagged_json=json.dumps([]),
                confidence="high",
                repeat_days=0,
            )
            db.add(db_triage)

        db.add(
            AuditLog(
                actor="system_orchestrator",
                action="EMERGENCY_RED_FLAG_BYPASS",
                target_type="session",
                target_id=session_id,
                details_json=json.dumps(rf_details),
            )
        )
        db.commit()
        return triage_res, agent_trace

    agent_trace.append(
        GateStep(
            gate_number=2,
            gate_name="Red-Flag Emergency Gate",
            status="PASSED",
            category="RECORDED_OBSERVATION",
            details={"acute_red_flags": {}, "status": "No red-flag symptoms reported."},
        )
    )

    # ----------------------------------------------------
    # GATE 3: Context & Completeness Gate
    # ----------------------------------------------------
    ctx_input = ContextCheckinInput(**submission.context.model_dump())
    is_ctx_affected, ctx_reasons = evaluate_context(ctx_input)

    func_items = submission.function_items or ([0] * 8)
    func_score = sum(func_items)
    function_worse = func_score >= 3

    # Check risk profile exists
    risk_prof = db.exec(select(RiskProfile).where(RiskProfile.user_id == user_id)).first()
    has_risk_profile = risk_prof is not None
    has_func_report = len(func_items) == 8

    data_confidence = evaluate_confidence(has_func_report, has_risk_profile)

    agent_trace.append(
        GateStep(
            gate_number=3,
            gate_name="Context & Completeness Gate",
            status="AFFECTED" if is_ctx_affected else "PASSED",
            category="RECORDED_OBSERVATION",
            details={
                "sleep_hours": submission.context.sleep_hours,
                "mood_positive": submission.context.mood_positive,
                "context_affected": is_ctx_affected,
                "context_reasons": ctx_reasons,
                "function_score": func_score,
                "function_worse": function_worse,
                "data_confidence": data_confidence,
            },
        )
    )

    # ----------------------------------------------------
    # GATE 4: Deterministic Longitudinal Engine & Triage
    # ----------------------------------------------------
    # Fetch historical sessions for this user (ordered by session_number)
    history_sessions = db.exec(
        select(SessionRecord)
        .where(SessionRecord.user_id == user_id)
        .order_by(SessionRecord.session_number)  # type: ignore
    ).all()

    # Sessions 2, 3, 4 are valid baseline
    baseline_sessions = [s for s in history_sessions if s.session_number in [2, 3, 4]]
    has_valid_baseline = len(baseline_sessions) >= 3

    domain_results: Dict[str, DomainScoreResult] = {}
    pop_params = DEFAULT_POP_PARAMS

    if has_valid_baseline:
        # Collect baseline raw scores
        baseline_scores: Dict[str, List[float]] = {"memory": [], "sequence_av": [], "attention_rt": []}
        for b_sess in baseline_sessions:
            t_results = db.exec(
                select(TaskResult).where(TaskResult.session_id == b_sess.id)
            ).all()
            for tr in t_results:
                if tr.domain in baseline_scores:
                    baseline_scores[tr.domain].append(tr.raw_score)

        baselines = {}
        for dom in ["memory", "sequence_av", "attention_rt"]:
            scores_list = baseline_scores[dom]
            pop_sd = pop_params.get(dom, {}).get("pop_sd", 2.0)
            baselines[dom] = compute_baseline(dom, scores_list, pop_sd=pop_sd, k=4.0)

        # Retrieve previous findings to update CUSUM and check consecutive clean flags
        prev_findings = (
            db.exec(
                select(Finding)
                .join(SessionRecord, Finding.session_id == SessionRecord.id)
                .where(SessionRecord.user_id == user_id)
                .order_by(SessionRecord.session_number.desc())  # type: ignore
            ).all()
        )

        prev_clean_flagged_domains: List[str] = []
        latest_cusum_map: Dict[str, float] = {}

        # Scan previous session findings
        if history_sessions:
            last_sess = history_sessions[-1]
            last_findings = [f for f in prev_findings if f.session_id == last_sess.id]
            for lf in last_findings:
                if lf.robust_z is not None and lf.robust_z <= -1.5:
                    prev_clean_flagged_domains.append(lf.domain)
                latest_cusum_map[lf.domain] = lf.cusum_s

        # Score current session domains
        for dom in ["memory", "sequence_av", "attention_rt"]:
            raw_val = submission.scores.get(dom, pop_params[dom]["pop_mean"])
            b = baselines[dom]
            pop_sd = pop_params[dom]["pop_sd"]
            rel = pop_params[dom]["reliability"]

            z = compute_robust_z(raw_val, b.median, b.sd)
            rci = compute_rci(raw_val, b.median, pop_sd, rel)
            rel_dec = rci <= -1.96

            prev_s = latest_cusum_map.get(dom, 0.0)
            if not is_ctx_affected:
                new_s, drift_alarm = update_cusum(prev_s, z, k=0.5, h=4.0)
            else:
                new_s = prev_s
                drift_alarm = prev_s > 4.0

            floor = pop_params[dom]["safety_floor"]
            below_floor = raw_val <= floor

            dom_results[dom] = DomainScoreResult(
                domain=dom,
                raw_score=raw_val,
                baseline_median=b.median,
                baseline_sd=b.sd,
                robust_z=z,
                rci=rci,
                reliable_decline=rel_dec,
                cusum_s=new_s,
                drift_alarm=drift_alarm,
                below_safety_floor=below_floor,
            )

            # Persist finding
            existing_finding = db.exec(
                select(Finding).where(Finding.session_id == session_id, Finding.domain == dom)
            ).first()
            if not existing_finding:
                db.add(
                    Finding(
                        session_id=session_id,
                        domain=dom,
                        robust_z=z,
                        rci=rci,
                        reliable_decline=rel_dec,
                        cusum_s=new_s,
                        drift_alarm=drift_alarm,
                        below_safety_floor=below_floor,
                    )
                )

        triage_res = evaluate_triage(
            domain_results=dom_results,
            has_valid_baseline=True,
            context_affected=is_ctx_affected,
            function_worse=function_worse,
            prev_clean_flagged_domains=prev_clean_flagged_domains,
        )
    else:
        # Building baseline
        triage_res = evaluate_triage(
            domain_results={},
            has_valid_baseline=False,
            context_affected=is_ctx_affected,
            function_worse=function_worse,
        )

    math_details = {
        "has_valid_baseline": has_valid_baseline,
        "triage_color": triage_res.color,
        "reasons": triage_res.reasons,
        "domains_flagged": triage_res.domains_flagged,
        "repeat_days": triage_res.repeat_days,
        "domain_scores": {
            d: {
                "raw": res.raw_score,
                "robust_z": res.robust_z,
                "rci": res.rci,
                "cusum_s": res.cusum_s,
                "drift_alarm": res.drift_alarm,
            }
            for d, res in domain_results.items()
        },
    }

    agent_trace.append(
        GateStep(
            gate_number=4,
            gate_name="Deterministic Longitudinal Engine",
            status="FLAGGED" if triage_res.color in ["orange", "red"] else "PASSED",
            category="CALCULATED_MATH",
            details=math_details,
        )
    )

    # ----------------------------------------------------
    # GATE 5: Clinician Hold & Release Gate
    # ----------------------------------------------------
    triage_id = f"triage_{session_id}"
    db_triage = db.get(Triage, triage_id)
    if not db_triage:
        db_triage = Triage(
            id=triage_id,
            session_id=session_id,
            user_id=user_id,
            color=triage_res.color,
            urgent_emergency=triage_res.urgent_emergency,
            held_for_review=triage_res.held_for_review,
            reasons_json=json.dumps(triage_res.reasons),
            domains_flagged_json=json.dumps(triage_res.domains_flagged),
            confidence=data_confidence,
            repeat_days=triage_res.repeat_days,
        )
        db.add(db_triage)
    else:
        db_triage.color = triage_res.color
        db_triage.held_for_review = triage_res.held_for_review
        db_triage.reasons_json = json.dumps(triage_res.reasons)
        db_triage.domains_flagged_json = json.dumps(triage_res.domains_flagged)
        db_triage.repeat_days = triage_res.repeat_days

    # If held for review, ensure pending review record exists
    if triage_res.held_for_review:
        existing_review = db.exec(select(Review).where(Review.triage_id == triage_id)).first()
        if not existing_review:
            db.add(
                Review(
                    triage_id=triage_id,
                    user_id=user_id,
                    decision=None,
                    note=None,
                    checked_causes_json="[]",
                    referral_destination=None,
                    released_at=None,
                )
            )

    agent_trace.append(
        GateStep(
            gate_number=5,
            gate_name="Clinician Hold & Release Gate",
            status="HOLD_PENDING_CLINICIAN" if triage_res.held_for_review else "RELEASED_DIRECT",
            category="TEMPLATE_EXPLANATION",
            details={
                "held_for_review": triage_res.held_for_review,
                "message": (
                    "Case placed in clinician hold queue for reversible-cause review before participant disclosure."
                    if triage_res.held_for_review
                    else "Released directly to participant console."
                ),
            },
        )
    )

    # Persist context and function reports
    db.add(
        ContextCheckin(
            session_id=session_id,
            sleep_hours=submission.context.sleep_hours,
            mood_positive=submission.context.mood_positive,
            illness=submission.context.illness,
            new_medication=submission.context.new_medication,
            pain=submission.context.pain,
            distraction=submission.context.distraction,
            red_flags_json=json.dumps(submission.red_flags.model_dump()),
        )
    )

    db.add(
        FunctionReport(
            session_id=session_id,
            user_id=user_id,
            items_json=json.dumps(func_items),
            total_score=func_score,
            function_worse=function_worse,
        )
    )

    db.add(
        AuditLog(
            actor="system_orchestrator",
            action="TRIAGE_EVALUATED",
            target_type="session",
            target_id=session_id,
            details_json=json.dumps({
                "triage_color": triage_res.color,
                "held_for_review": triage_res.held_for_review,
                "confidence": data_confidence,
            }),
        )
    )

    db.commit()
    return triage_res, agent_trace
