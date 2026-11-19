"""Script to generate and seed ~100 realistic patients with longitudinal data,
sessions, context checkins, cognitive scores, risk profiles, and triages.
"""

import random
import json
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from apps.api.database import engine
from apps.api.models import (
    User,
    Consent,
    SessionRecord,
    TaskResult,
    ContextCheckin,
    FunctionReport,
    RiskProfile,
    Finding,
    Triage,
    AuditLog,
)
from packages.engine.baseline import compute_baseline, DEFAULT_POP_PARAMS
from packages.engine.scoring import (
    compute_robust_z,
    compute_rci,
    update_cusum,
)

FIRST_NAMES_MALE = [
    "Mohammed", "Ahmed", "Ali", "Sultan", "Mansoor", "Hamad", "Saeed", "Zayed",
    "Rashid", "Abdullah", "Khalid", "Salem", "Nasser", "Hazza", "Fahad", "Khalfan",
    "Obaid", "Majid", "Ibrahim", "Youssef", "Marwan", "Saif", "Bader", "Omar"
]

FIRST_NAMES_FEMALE = [
    "Fatima", "Maryam", "Ayesha", "Shamsa", "Moza", "Salama", "Meera", "Latifa",
    "Al-Anood", "Hassa", "Amna", "Sheikha", "Maitha", "Mona", "Noura", "Layla",
    "Reem", "Hind", "Rawdha", "Dana", "Khawla", "Asma", "Huda", "Lubna"
]

FAMILY_NAMES = [
    "Al-Mansoor", "Al-Nuaimi", "Al-Zaabi", "Al-Ali", "Al-Husseini", "Al-Khouri",
    "Al-Shamsi", "Al-Ketbi", "Al-Dhaheri", "Al-Mazrouei", "Al-Falasi", "Al-Maktoum",
    "Al-Qasimi", "Al-Suwaidi", "Al-Blooshi", "Al-Ghafli", "Al-Hammadi", "Al-Kaabi",
    "Al-Marzouqi", "Al-Mehairi", "Al-Muhairi", "Al-Rumaithi", "Al-Shehhi", "Al-Tenaiji"
]

INSURANCE_PROVIDERS = [
    "Daman (Thiqa)", "Daman (Enhanced)", "ADNIC", "NextCare", "AXA Gulf / GIG", "Oman Insurance"
]

CLINICIANS = ["dr_nour", "dr_khalid", "dr_fatima"]

RISK_FACTORS_POOL = [
    "hypertension", "diabetes_type2", "hearing_loss", "sleep_apnea",
    "dyslipidemia", "smoking_history", "sedentary_lifestyle", "family_history_ad"
]

def generate_patients(count=100):
    random.seed(2026)
    created_patients = 0
    created_sessions = 0
    created_triages = 0

    with Session(engine) as db:
        # Check existing patient count to avoid id collision
        existing_users = set(db.exec(select(User.id)).all())

        for i in range(1, count + 1):
            user_id = f"patient_{i:03d}"
            if user_id in existing_users:
                continue

            sex = random.choice(["M", "F"])
            first_name = random.choice(FIRST_NAMES_MALE if sex == "M" else FIRST_NAMES_FEMALE)
            last_name = random.choice(FAMILY_NAMES)
            full_name = f"{first_name} {last_name}"
            age = random.randint(45, 86)
            lang = random.choice(["ar", "ar", "ar", "en"]) # UAE demographic leaning
            education = random.choices(["low", "mid", "high"], weights=[0.25, 0.45, 0.30])[0]
            attending_clinician = random.choice(CLINICIANS)
            insurance = random.choice(INSURANCE_PROVIDERS)
            mrn = f"MRN-AD-{random.randint(100000, 999999)}"
            copay_status = random.choice(["completed", "completed", "completed", "exempt", "pending"])
            email = f"{first_name.lower()}.{last_name.lower().replace('al-', '').replace('-', '')}{i}@health.ae"

            patient_days_ago = random.randint(90, 240)
            user_created_at = datetime.now(timezone.utc) - timedelta(days=patient_days_ago)

            user = User(
                id=user_id,
                name=full_name,
                email=email,
                password="password123",
                role="participant",
                age=age,
                sex=sex,
                language=lang,
                education_band=education,
                mrn=mrn,
                insurance_provider=insurance,
                copay_status=copay_status,
                attending_clinician_id=attending_clinician,
                is_active=True,
                created_at=user_created_at,
            )
            db.add(user)

            # Consents
            db.add(Consent(user_id=user_id, scope="cognition", granted=True, updated_at=user_created_at))
            if random.random() > 0.15:
                db.add(Consent(user_id=user_id, scope="malaffi_fhir", granted=True, updated_at=user_created_at))

            # Risk Profile
            selected_factors = random.sample(RISK_FACTORS_POOL, k=random.choices([0, 1, 2, 3, 4], weights=[0.2, 0.3, 0.3, 0.15, 0.05])[0])
            risk_tier = "low"
            repeat_days = 365
            if len(selected_factors) >= 3 or age >= 75:
                risk_tier = "high"
                repeat_days = 90
            elif len(selected_factors) >= 1 or age >= 65:
                risk_tier = "moderate"
                repeat_days = 180

            db.add(RiskProfile(
                user_id=user_id,
                factors_json=json.dumps(selected_factors),
                total_points=len(selected_factors),
                tier=risk_tier,
                repeat_days=repeat_days,
                updated_at=user_created_at,
            ))

            # Clinical Trajectory Category
            # Category distribution:
            # - Stable Green: 60%
            # - Baseline In Progress: 15%
            # - Yellow Confounded/Mild Dip: 15%
            # - Orange Persistent Decline (Review Queue): 8%
            # - Red Urgent Emergency Flag: 2%
            cat = random.choices(
                ["stable_green", "building_baseline", "yellow_dip", "orange_decline", "red_emergency"],
                weights=[0.60, 0.15, 0.15, 0.08, 0.02]
            )[0]

            # Base abilities per domain (adjusted slightly for education)
            edu_shift = {"low": -0.8, "mid": 0.0, "high": +0.8}[education]
            base_memory = 13.0 + edu_shift + random.uniform(-1.0, 1.0)
            base_sequence = 11.5 + edu_shift + random.uniform(-0.8, 0.8)
            base_rt = 52.0 - (edu_shift * 1.5) + random.uniform(-3.0, 3.0)

            # Generate sessions
            if cat == "building_baseline":
                num_sessions = random.choice([1, 2])
            elif cat == "red_emergency":
                num_sessions = random.choice([2, 3, 4])
            else:
                num_sessions = random.choice([4, 5, 6, 7])

            # Session timing
            session_dates = []
            for s_idx in range(num_sessions):
                days_before = int(patient_days_ago * (1.0 - (s_idx / max(1, num_sessions - 1)))) if num_sessions > 1 else patient_days_ago - 10
                # last session should be within recent 1-30 days
                if s_idx == num_sessions - 1:
                    days_before = random.randint(1, 14)
                session_dates.append(days_before)
            session_dates.sort(reverse=True) # Earliest to latest

            cusum_s = {"memory": 0.0, "sequence_av": 0.0, "attention_rt": 0.0}
            baseline_calibrated = False
            user_baselines = {}

            for s_idx in range(1, num_sessions + 1):
                s_id = f"sess_{user_id}_{s_idx}"
                days_ago = session_dates[s_idx - 1]
                sess_time = datetime.now(timezone.utc) - timedelta(days=days_ago)
                is_practice = (s_idx == 1)
                is_last_session = (s_idx == num_sessions)

                # Generate scores depending on trajectory and session
                mem_sc = base_memory + random.gauss(0, 0.6)
                seq_sc = base_sequence + random.gauss(0, 0.7)
                rt_sc = base_rt + random.gauss(0, 2.0)

                sleep = round(random.uniform(6.5, 8.5), 1)
                mood = True
                illness = False
                meds = False
                red_flags = {}
                func_worse = False
                func_score = 0

                if cat == "yellow_dip" and is_last_session:
                    sleep = round(random.uniform(3.0, 4.5), 1)
                    mem_sc -= 2.2
                    rt_sc += 8.0 # slower RT
                    mood = False
                elif cat == "orange_decline" and is_last_session:
                    mem_sc -= 3.5
                    seq_sc -= 2.8
                    func_worse = True
                    func_score = random.randint(3, 6)
                elif cat == "red_emergency" and is_last_session:
                    red_flags = {"sudden_confusion": True, "speech_trouble": True}
                    func_worse = True
                    func_score = 4

                scores = {
                    "memory": round(max(3.0, mem_sc), 1),
                    "sequence_av": round(max(2.0, seq_sc), 1),
                    "attention_rt": round(max(25.0, rt_sc), 1),
                }

                form_v = ["A", "B", "C", "D"][(s_idx - 1) % 4]
                device = random.choice(["iPad 10th Gen", "Samsung Galaxy Tab S8", "iPad Pro 11", "Lenovo Tab M10", "iPhone 14 / Safari", "Chrome / Desktop"])

                db.add(SessionRecord(
                    id=s_id,
                    user_id=user_id,
                    session_number=s_idx,
                    form_version=form_v,
                    is_practice=is_practice,
                    device=device,
                    completed_at=sess_time,
                ))

                for dom, sc in scores.items():
                    db.add(TaskResult(
                        session_id=s_id,
                        domain=dom,
                        raw_score=sc,
                        completed_at=sess_time,
                    ))

                db.add(ContextCheckin(
                    session_id=s_id,
                    sleep_hours=sleep,
                    mood_positive=mood,
                    illness=illness,
                    new_medication=meds,
                    red_flags_json=json.dumps(red_flags) if red_flags else None,
                    recorded_at=sess_time,
                ))

                func_items = [1 if func_worse and j < func_score else 0 for j in range(8)]
                db.add(FunctionReport(
                    session_id=s_id,
                    user_id=user_id,
                    items_json=json.dumps(func_items),
                    total_score=func_score,
                    function_worse=func_worse,
                    recorded_at=sess_time,
                ))

                created_sessions += 1

                # Calibrate baselines after session 4 (or 3 non-practice sessions)
                if s_idx == 4 and not baseline_calibrated:
                    user_baselines = {
                        "memory": compute_baseline("memory", [base_memory - 0.2, base_memory + 0.3, base_memory], pop_sd=1.8),
                        "sequence_av": compute_baseline("sequence_av", [base_sequence, base_sequence + 0.2, base_sequence - 0.1], pop_sd=2.0),
                        "attention_rt": compute_baseline("attention_rt", [base_rt, base_rt - 1.0, base_rt + 1.2], pop_sd=6.5),
                    }
                    baseline_calibrated = True

                # Generate Findings and Triage on later sessions or terminal session
                if is_last_session:
                    t_id = f"triage_{user_id}_{s_idx}"

                    if cat == "building_baseline":
                        db.add(Triage(
                            id=t_id,
                            session_id=s_id,
                            user_id=user_id,
                            color="baseline",
                            urgent_emergency=False,
                            held_for_review=False,
                            reasons_json=json.dumps([f"Establishing personalized baseline (session {s_idx} of 4)."]),
                            domains_flagged_json=json.dumps([]),
                            confidence="medium",
                            repeat_days=30,
                            created_at=sess_time,
                        ))
                    elif cat == "red_emergency":
                        db.add(Triage(
                            id=t_id,
                            session_id=s_id,
                            user_id=user_id,
                            color="red",
                            urgent_emergency=True,
                            held_for_review=False,
                            reasons_json=json.dumps(["Urgent neurological symptoms reported (sudden confusion / speech impairment). Immediate emergency referral."]),
                            domains_flagged_json=json.dumps([]),
                            confidence="high",
                            repeat_days=0,
                            created_at=sess_time,
                        ))
                    elif cat == "orange_decline":
                        db.add(Triage(
                            id=t_id,
                            session_id=s_id,
                            user_id=user_id,
                            color="orange",
                            urgent_emergency=False,
                            held_for_review=True, # Clinician review queue
                            reasons_json=json.dumps([
                                "Persistent longitudinal decline verified across memory and audio-visual domains.",
                                "Functional impairment reported in ADL activities.",
                                "Cumulative statistical drift (CUSUM) breached threshold."
                            ]),
                            domains_flagged_json=json.dumps(["memory", "sequence_av"]),
                            confidence="high",
                            repeat_days=30,
                            created_at=sess_time,
                        ))
                    elif cat == "yellow_dip":
                        db.add(Triage(
                            id=t_id,
                            session_id=s_id,
                            user_id=user_id,
                            color="yellow",
                            urgent_emergency=False,
                            held_for_review=False,
                            reasons_json=json.dumps([
                                f"Acute performance dip confounded by reported sleep disturbance ({sleep} hrs). Repeat check in 14 days."
                            ]),
                            domains_flagged_json=json.dumps(["memory"]),
                            confidence="high",
                            repeat_days=14,
                            created_at=sess_time,
                        ))
                    else: # stable_green
                        db.add(Triage(
                            id=t_id,
                            session_id=s_id,
                            user_id=user_id,
                            color="green",
                            urgent_emergency=False,
                            held_for_review=False,
                            reasons_json=json.dumps([
                                "Cognitive trajectory stable within personal baseline normative limits across all assessed domains."
                            ]),
                            domains_flagged_json=json.dumps([]),
                            confidence="high",
                            repeat_days=repeat_days,
                            created_at=sess_time,
                        ))

                    created_triages += 1

            created_patients += 1

        db.commit()

    print(f"Successfully generated:")
    print(f" - Patients: {created_patients}")
    print(f" - Sessions: {created_sessions}")
    print(f" - Triages: {created_triages}")

if __name__ == "__main__":
    generate_patients(100)
