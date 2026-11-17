"""Idempotent seeder for the 5 official hackathon demo personas.

Personas:
1. user_layla: Orange held in Clinician Queue (6 sessions, persistent decline + functional change)
2. user_tariq: Yellow context-confounded acute sleep dip (5 sessions, sleep 3.5 hrs)
3. user_fatima: Green stable low-education fairness demo (5 sessions, stable personal baseline)
4. user_omar: Red emergency bypass (acute sudden confusion & speech trouble)
5. user_sara: Building baseline (session 2 of 4, baseline calibration in progress)
"""

import json
from datetime import datetime, timezone, timedelta
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
)
from packages.engine.baseline import compute_baseline, DEFAULT_POP_PARAMS
from packages.engine.scoring import (
    compute_robust_z,
    compute_rci,
    update_cusum,
    DomainScoreResult,
)
from packages.engine.triage import evaluate_triage


def now_offset(days_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


def seed_demo_data(db: Session) -> None:
    """Seeds or updates the 5 demo personas idempotently."""

    # ========================================================
    # 1. LAYLA AL-MANSOORI (user_layla) - Orange Held in Queue
    # ========================================================
    if not db.get(User, "user_layla"):
        db.add(
            User(
                id="user_layla",
                name="Layla Al-Mansoori",
                age=68,
                sex="F",
                language="ar",
                education_band="high",
                created_at=now_offset(180),
            )
        )

    # Consent
    if not db.exec(select(Consent).where(Consent.user_id == "user_layla", Consent.scope == "cognition")).first():
        db.add(Consent(user_id="user_layla", scope="cognition", granted=True, updated_at=now_offset(180)))
    if not db.exec(select(Consent).where(Consent.user_id == "user_layla", Consent.scope == "malaffi_fhir")).first():
        db.add(Consent(user_id="user_layla", scope="malaffi_fhir", granted=True, updated_at=now_offset(180)))

    # Risk Profile (hypertension, hearing loss, sleep apnea = 3 points -> Moderate)
    if not db.exec(select(RiskProfile).where(RiskProfile.user_id == "user_layla")).first():
        db.add(
            RiskProfile(
                user_id="user_layla",
                factors_json=json.dumps(["hypertension", "hearing_loss", "sleep_apnea"]),
                total_points=3,
                tier="moderate",
                repeat_days=180,
                updated_at=now_offset(180),
            )
        )

    # Layla 6 Sessions
    layla_data = [
        # sess 1: practice
        {"num": 1, "days": 150, "practice": True, "scores": {"memory": 11.0, "sequence_av": 10.0, "attention_rt": 48.0}, "sleep": 7.0, "worse": False, "f_score": 0},
        # sess 2: baseline 1
        {"num": 2, "days": 120, "practice": False, "scores": {"memory": 13.5, "sequence_av": 12.0, "attention_rt": 54.0}, "sleep": 7.5, "worse": False, "f_score": 0},
        # sess 3: baseline 2
        {"num": 3, "days": 90, "practice": False, "scores": {"memory": 14.0, "sequence_av": 12.5, "attention_rt": 53.0}, "sleep": 7.0, "worse": False, "f_score": 0},
        # sess 4: baseline 3
        {"num": 4, "days": 60, "practice": False, "scores": {"memory": 13.5, "sequence_av": 12.0, "attention_rt": 55.0}, "sleep": 7.5, "worse": False, "f_score": 0},
        # sess 5: mild clean dip
        {"num": 5, "days": 30, "practice": False, "scores": {"memory": 11.2, "sequence_av": 10.8, "attention_rt": 51.0}, "sleep": 7.0, "worse": False, "f_score": 1},
        # sess 6: persistent clean decline + functional impact -> ORANGE HELD
        {"num": 6, "days": 2, "practice": False, "scores": {"memory": 9.5, "sequence_av": 9.0, "attention_rt": 47.0}, "sleep": 6.8, "worse": True, "f_score": 4},
    ]

    layla_baselines = {
        "memory": compute_baseline("memory", [13.5, 14.0, 13.5], pop_sd=1.8),
        "sequence_av": compute_baseline("sequence_av", [12.0, 12.5, 12.0], pop_sd=2.0),
        "attention_rt": compute_baseline("attention_rt", [54.0, 53.0, 55.0], pop_sd=6.5),
    }

    layla_cusum = {"memory": 0.0, "sequence_av": 0.0, "attention_rt": 0.0}

    for item in layla_data:
        s_id = f"sess_layla_{item['num']}"
        if not db.get(SessionRecord, s_id):
            db.add(
                SessionRecord(
                    id=s_id,
                    user_id="user_layla",
                    session_number=item["num"],
                    form_version=["A", "B", "C", "D"][item["num"] % 4],
                    is_practice=item["practice"],
                    device="iPad Pro (Safari)",
                    completed_at=now_offset(item["days"]),
                )
            )

            # Task Results
            for dom, score in item["scores"].items():
                db.add(TaskResult(session_id=s_id, domain=dom, raw_score=score, completed_at=now_offset(item["days"])))

            # Context
            db.add(
                ContextCheckin(
                    session_id=s_id,
                    sleep_hours=item["sleep"],
                    mood_positive=False,
                    illness=False,
                    new_medication=False,
                    recorded_at=now_offset(item["days"]),
                )
            )

            # Function Report
            db.add(
                FunctionReport(
                    session_id=s_id,
                    user_id="user_layla",
                    items_json=json.dumps([1, 1, 1, 1, 0, 0, 0, 0] if item["worse"] else [0] * 8),
                    total_score=item["f_score"],
                    function_worse=item["worse"],
                    recorded_at=now_offset(item["days"]),
                )
            )

            # Findings for sessions 5 and 6
            if item["num"] >= 5:
                dom_findings = {}
                for dom, score in item["scores"].items():
                    b = layla_baselines[dom]
                    z = compute_robust_z(score, b.median, b.sd)
                    rci = compute_rci(score, b.median, DEFAULT_POP_PARAMS[dom]["pop_sd"], DEFAULT_POP_PARAMS[dom]["reliability"])
                    new_s, drift = update_cusum(layla_cusum[dom], z, k=0.5, h=4.0)
                    layla_cusum[dom] = new_s

                    db.add(
                        Finding(
                            session_id=s_id,
                            domain=dom,
                            robust_z=z,
                            rci=rci,
                            reliable_decline=rci <= -1.96,
                            cusum_s=new_s,
                            drift_alarm=drift,
                            below_safety_floor=score <= DEFAULT_POP_PARAMS[dom]["safety_floor"],
                        )
                    )
                    dom_findings[dom] = DomainScoreResult(
                        domain=dom,
                        raw_score=score,
                        baseline_median=b.median,
                        baseline_sd=b.sd,
                        robust_z=z,
                        rci=rci,
                        cusum_s=new_s,
                        drift_alarm=drift,
                    )

                # Triage
                t_id = f"triage_layla_{item['num']}"
                if item["num"] == 6:
                    # ORANGE HELD
                    db.add(
                        Triage(
                            id=t_id,
                            session_id=s_id,
                            user_id="user_layla",
                            color="orange",
                            urgent_emergency=False,
                            held_for_review=True,
                            reasons_json=json.dumps([
                                "Persistent clean decline in memory (z = -1.94) and sequence audio-visual recall (z = -1.65).",
                                "Reported change in managing household finances and medication tracking.",
                                "Cumulative downward drift alarm triggered in memory domain.",
                            ]),
                            domains_flagged_json=json.dumps(["memory", "sequence_av"]),
                            confidence="high",
                            repeat_days=30,
                            created_at=now_offset(item["days"]),
                        )
                    )
                    # Clinician Hold Queue review
                    if not db.exec(select(Review).where(Review.triage_id == t_id)).first():
                        db.add(
                            Review(
                                triage_id=t_id,
                                user_id="user_layla",
                                decision=None,
                                note=None,
                                checked_causes_json="[]",
                                referral_destination=None,
                                released_at=None,
                                created_at=now_offset(item["days"]),
                            )
                        )
                else:
                    # Session 5: Yellow (single domain mild dip)
                    db.add(
                        Triage(
                            id=t_id,
                            session_id=s_id,
                            user_id="user_layla",
                            color="yellow",
                            urgent_emergency=False,
                            held_for_review=False,
                            reasons_json=json.dumps(["Subtle single-domain dip in memory. Repeat check in 14 days."]),
                            domains_flagged_json=json.dumps(["memory"]),
                            confidence="high",
                            repeat_days=14,
                            created_at=now_offset(item["days"]),
                        )
                    )

    # ========================================================
    # 2. TARIQ AL-NUAIMI (user_tariq) - Yellow Sleep Dip
    # ========================================================
    if not db.get(User, "user_tariq"):
        db.add(
            User(
                id="user_tariq",
                name="Tariq Al-Nuaimi",
                age=58,
                sex="M",
                language="ar",
                education_band="mid",
                created_at=now_offset(120),
            )
        )
    if not db.exec(select(Consent).where(Consent.user_id == "user_tariq", Consent.scope == "cognition")).first():
        db.add(Consent(user_id="user_tariq", scope="cognition", granted=True, updated_at=now_offset(120)))

    tariq_sessions = [
        {"num": 1, "days": 90, "practice": True, "scores": {"memory": 12.0, "sequence_av": 11.0, "attention_rt": 50.0}, "sleep": 7.0, "ctx": False},
        {"num": 2, "days": 60, "practice": False, "scores": {"memory": 13.0, "sequence_av": 12.0, "attention_rt": 53.0}, "sleep": 7.0, "ctx": False},
        {"num": 3, "days": 40, "practice": False, "scores": {"memory": 13.0, "sequence_av": 11.5, "attention_rt": 54.0}, "sleep": 7.5, "ctx": False},
        {"num": 4, "days": 20, "practice": False, "scores": {"memory": 13.5, "sequence_av": 12.0, "attention_rt": 52.0}, "sleep": 7.0, "ctx": False},
        # Session 5: Severe sleep disruption 3.5 hrs -> Yellow (repeat 10 days)
        {"num": 5, "days": 1, "practice": False, "scores": {"memory": 10.0, "sequence_av": 9.5, "attention_rt": 42.0}, "sleep": 3.5, "ctx": True},
    ]

    for item in tariq_sessions:
        s_id = f"sess_tariq_{item['num']}"
        if not db.get(SessionRecord, s_id):
            db.add(SessionRecord(id=s_id, user_id="user_tariq", session_number=item["num"], form_version="B", is_practice=item["practice"], completed_at=now_offset(item["days"])))
            for dom, sc in item["scores"].items():
                db.add(TaskResult(session_id=s_id, domain=dom, raw_score=sc, completed_at=now_offset(item["days"])))
            db.add(ContextCheckin(session_id=s_id, sleep_hours=item["sleep"], mood_positive=item["ctx"], illness=False, new_medication=False, recorded_at=now_offset(item["days"])))
            db.add(FunctionReport(session_id=s_id, user_id="user_tariq", items_json="[0,0,0,0,0,0,0,0]", total_score=0, function_worse=False, recorded_at=now_offset(item["days"])))

            if item["num"] == 5:
                db.add(
                    Triage(
                        id=f"triage_tariq_5",
                        session_id=s_id,
                        user_id="user_tariq",
                        color="yellow",
                        urgent_emergency=False,
                        held_for_review=False,
                        reasons_json=json.dumps(["Temporary cognitive dip observed following acute sleep disruption (3.5 hours). Repeat check in 10 days."]),
                        domains_flagged_json=json.dumps(["attention_rt", "memory"]),
                        confidence="medium",
                        repeat_days=10,
                        created_at=now_offset(item["days"]),
                    )
                )

    # ========================================================
    # 3. FATIMA AL-ALI (user_fatima) - Green Stable Low-Education Fairness Demo
    # ========================================================
    if not db.get(User, "user_fatima"):
        db.add(
            User(
                id="user_fatima",
                name="Fatima Al-Ali",
                age=72,
                sex="F",
                language="ar",
                education_band="low",
                created_at=now_offset(150),
            )
        )
    if not db.exec(select(Consent).where(Consent.user_id == "user_fatima", Consent.scope == "cognition")).first():
        db.add(Consent(user_id="user_fatima", scope="cognition", granted=True, updated_at=now_offset(150)))

    fatima_sessions = [
        {"num": 1, "days": 120, "practice": True, "scores": {"memory": 10.0, "sequence_av": 9.0, "attention_rt": 42.0}},
        {"num": 2, "days": 90, "practice": False, "scores": {"memory": 11.5, "sequence_av": 10.0, "attention_rt": 45.0}},
        {"num": 3, "days": 60, "practice": False, "scores": {"memory": 11.0, "sequence_av": 10.5, "attention_rt": 46.0}},
        {"num": 4, "days": 30, "practice": False, "scores": {"memory": 11.5, "sequence_av": 10.0, "attention_rt": 45.0}},
        # Session 5: Perfectly stable relative to her personal baseline! (Green)
        {"num": 5, "days": 3, "practice": False, "scores": {"memory": 11.5, "sequence_av": 10.0, "attention_rt": 45.5}},
    ]

    for item in fatima_sessions:
        s_id = f"sess_fatima_{item['num']}"
        if not db.get(SessionRecord, s_id):
            db.add(SessionRecord(id=s_id, user_id="user_fatima", session_number=item["num"], form_version="C", is_practice=item["practice"], completed_at=now_offset(item["days"])))
            for dom, sc in item["scores"].items():
                db.add(TaskResult(session_id=s_id, domain=dom, raw_score=sc, completed_at=now_offset(item["days"])))
            db.add(ContextCheckin(session_id=s_id, sleep_hours=7.5, mood_positive=False, illness=False, new_medication=False, recorded_at=now_offset(item["days"])))
            db.add(FunctionReport(session_id=s_id, user_id="user_fatima", items_json="[0,0,0,0,0,0,0,0]", total_score=0, function_worse=False, recorded_at=now_offset(item["days"])))

            if item["num"] == 5:
                db.add(
                    Triage(
                        id=f"triage_fatima_5",
                        session_id=s_id,
                        user_id="user_fatima",
                        color="green",
                        urgent_emergency=False,
                        held_for_review=False,
                        reasons_json=json.dumps(["Cognitive metrics are completely stable relative to personal baseline. Fairness preserved."]),
                        domains_flagged_json=json.dumps([]),
                        confidence="high",
                        repeat_days=90,
                        created_at=now_offset(item["days"]),
                    )
                )

    # ========================================================
    # 4. OMAR AL-HUSSEINI (user_omar) - Red Emergency Bypass
    # ========================================================
    if not db.get(User, "user_omar"):
        db.add(
            User(
                id="user_omar",
                name="Omar Al-Husseini",
                age=64,
                sex="M",
                language="en",
                education_band="mid",
                created_at=now_offset(100),
            )
        )
    if not db.exec(select(Consent).where(Consent.user_id == "user_omar", Consent.scope == "cognition")).first():
        db.add(Consent(user_id="user_omar", scope="cognition", granted=True, updated_at=now_offset(100)))

    omar_s_id = "sess_omar_5"
    if not db.get(SessionRecord, omar_s_id):
        db.add(SessionRecord(id=omar_s_id, user_id="user_omar", session_number=5, form_version="A", is_practice=False, completed_at=now_offset(1)))
        db.add(ContextCheckin(session_id=omar_s_id, sleep_hours=7.0, mood_positive=False, illness=False, new_medication=False, red_flags_json=json.dumps({"sudden_confusion": True, "speech_trouble": True}), recorded_at=now_offset(1)))
        db.add(FunctionReport(session_id=omar_s_id, user_id="user_omar", items_json="[0,0,0,0,0,0,0,0]", total_score=0, function_worse=False, recorded_at=now_offset(1)))
        db.add(
            Triage(
                id="triage_omar_5",
                session_id=omar_s_id,
                user_id="user_omar",
                color="red",
                urgent_emergency=True,
                held_for_review=False,
                reasons_json=json.dumps(["Urgent neurological symptoms reported (sudden confusion and speech difficulty). Immediate medical evaluation required."]),
                domains_flagged_json=json.dumps([]),
                confidence="high",
                repeat_days=0,
                created_at=now_offset(1),
            )
        )

    # ========================================================
    # 5. SARA AL-ZAABI (user_sara) - Building Baseline (1 of 3)
    # ========================================================
    if not db.get(User, "user_sara"):
        db.add(
            User(
                id="user_sara",
                name="Sara Al-Zaabi",
                age=49,
                sex="F",
                language="ar",
                education_band="mid",
                created_at=now_offset(30),
            )
        )
    if not db.exec(select(Consent).where(Consent.user_id == "user_sara", Consent.scope == "cognition")).first():
        db.add(Consent(user_id="user_sara", scope="cognition", granted=True, updated_at=now_offset(30)))

    sara_sessions = [
        {"num": 1, "days": 20, "practice": True, "scores": {"memory": 13.0, "sequence_av": 11.0, "attention_rt": 55.0}},
        {"num": 2, "days": 5, "practice": False, "scores": {"memory": 14.0, "sequence_av": 12.0, "attention_rt": 58.0}},
    ]
    for item in sara_sessions:
        s_id = f"sess_sara_{item['num']}"
        if not db.get(SessionRecord, s_id):
            db.add(SessionRecord(id=s_id, user_id="user_sara", session_number=item["num"], form_version="D", is_practice=item["practice"], completed_at=now_offset(item["days"])))
            for dom, sc in item["scores"].items():
                db.add(TaskResult(session_id=s_id, domain=dom, raw_score=sc, completed_at=now_offset(item["days"])))
            db.add(ContextCheckin(session_id=s_id, sleep_hours=7.5, mood_positive=False, illness=False, new_medication=False, recorded_at=now_offset(item["days"])))
            db.add(FunctionReport(session_id=s_id, user_id="user_sara", items_json="[0,0,0,0,0,0,0,0]", total_score=0, function_worse=False, recorded_at=now_offset(item["days"])))

            if item["num"] == 2:
                db.add(
                    Triage(
                        id=f"triage_sara_2",
                        session_id=s_id,
                        user_id="user_sara",
                        color="baseline",
                        urgent_emergency=False,
                        held_for_review=False,
                        reasons_json=json.dumps(["Establishing personal cognitive baseline (session 2 of 4). Two more check-ins needed."]),
                        domains_flagged_json=json.dumps([]),
                        confidence="medium",
                        repeat_days=30,
                        created_at=now_offset(item["days"]),
                    )
                )

    # Add audit log entry for seeding
    db.add(
        AuditLog(
            actor="system_seeder",
            action="SEEDED_DEMO_PERSONAS",
            target_type="system",
            target_id="cohort_demo_5",
            details_json=json.dumps({"seeded": ["user_layla", "user_tariq", "user_fatima", "user_omar", "user_sara"]}),
        )
    )

    db.commit()
