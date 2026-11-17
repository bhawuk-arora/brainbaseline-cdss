"""API integration tests using FastAPI TestClient."""

import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.database import init_db
from apps.api.seed import seed_demo_data
from sqlmodel import Session
from apps.api.database import engine


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    from sqlmodel import SQLModel
    SQLModel.metadata.drop_all(engine)
    init_db()
    with Session(engine) as session:
        seed_demo_data(session)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "version": "1.0.0"}


def test_users_list_and_seeded_personas(client):
    res = client.get("/api/users")
    assert res.status_code == 200
    users = res.json()
    user_ids = {u["id"] for u in users}
    assert "user_layla" in user_ids
    assert "user_tariq" in user_ids
    assert "user_fatima" in user_ids
    assert "user_omar" in user_ids
    assert "user_sara" in user_ids

    # Layla must be pending review initially
    layla = next(u for u in users if u["id"] == "user_layla")
    assert layla["pending_review"] is True
    assert layla["latest_triage_color"] == "orange"


def test_gate_5_clinician_hold_and_release(client):
    """Verify Layla's result is held until clinician signs off in Review Console."""
    # 1. Participant requests result -> Must be calm holding screen
    res = client.get("/api/users/user_layla/result")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "pending_clinician_review"
    assert "reviewing your longitudinal trend" in data["message_en"]
    # Label and raw score MUST NOT be disclosed to participant while held
    assert data["color"] is None

    # 2. Clinician checks queue -> Layla is in queue
    q_res = client.get("/api/review/queue")
    assert q_res.status_code == 200
    queue = q_res.json()
    layla_item = next((q for q in queue if q["user_id"] == "user_layla"), None)
    assert layla_item is not None
    assert layla_item["triage_color"] == "orange"

    # 3. Clinician approves plan and checks reversible causes
    decision_payload = {
        "clinician_id": "dr_nour_neurology",
        "decision": "approve",
        "note": "Reversible workup ordered: serum B12 and thyroid panel. Formal audiology assessment scheduled.",
        "checked_causes": ["rc4", "rc5"],
        "referral_destination": "Abu Dhabi Primary Care (SEHA) / Audiology",
    }
    dec_res = client.post(f"/api/review/{layla_item['triage_id']}/decision", json=decision_payload)
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "released"

    # 4. Now Participant requests result -> Unlocked!
    res_unlocked = client.get("/api/users/user_layla/result")
    assert res_unlocked.status_code == 200
    unlocked_data = res_unlocked.json()
    assert unlocked_data["status"] == "released"
    assert unlocked_data["color"] == "orange"
    assert "dr_nour_neurology" in unlocked_data["clinician_note"] or "Reversible workup" in unlocked_data["clinician_note"]
    assert len(unlocked_data["actions_en"]) == 3


def test_gate_1_consent_live_revocation(client):
    """Verify live consent revocation blocks screening immediately."""
    # Revoke consent
    revoke_res = client.post(
        "/api/consent",
        json={"user_id": "user_tariq", "scope": "cognition", "granted": False, "actor": "user_tariq"},
    )
    assert revoke_res.status_code == 200

    # Attempt to submit session results
    submission = {
        "user_id": "user_tariq",
        "scores": {"memory": 12.0, "sequence_av": 11.0, "attention_rt": 50.0},
        "context": {"sleep_hours": 7.0},
        "red_flags": {},
        "function_items": [0] * 8,
    }
    submit_res = client.post("/api/sessions/sess_tariq_blocked/results", json=submission)
    assert submit_res.status_code == 403

    # Re-grant consent
    grant_res = client.post(
        "/api/consent",
        json={"user_id": "user_tariq", "scope": "cognition", "granted": True, "actor": "user_tariq"},
    )
    assert grant_res.status_code == 200


def test_gate_2_emergency_bypass_submission(client):
    """Verify acute red flag triggers immediate emergency bypass."""
    submission = {
        "user_id": "user_omar",
        "scores": {"memory": 14.0, "sequence_av": 12.0, "attention_rt": 60.0},
        "context": {"sleep_hours": 7.0},
        "red_flags": {"sudden_confusion": True, "speech_trouble": True},
        "function_items": [0] * 8,
    }
    res = client.post("/api/sessions/sess_omar_test/results", json=submission)
    assert res.status_code == 200
    data = res.json()
    assert data["triage_color"] == "red"
    assert data["held_for_review"] is False
    # Check trace
    rf_trace = next(s for s in data["agent_trace"] if s["gate_number"] == 2)
    assert rf_trace["status"] == "BYPASS_EMERGENCY"


def test_malaffi_fhir_bundle_import(client):
    """Verify simulated Malaffi/FHIR wearable and risk import."""
    fhir_payload = {
        "user_id": "user_sara",
        "bundle_type": "malaffi_wearable",
        "factors": ["hypertension", "diabetes", "smoking", "physical_inactivity"],
    }
    res = client.post("/api/import/fhir", json=fhir_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["new_points"] == 4
    assert data["new_tier"] == "moderate"
    assert data["repeat_days"] == 180


def test_admin_audit_and_benchmark(client):
    """Verify admin audit log retrieval and benchmark viewing."""
    audit_res = client.get("/api/admin/audit")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0

    bench_res = client.get("/api/admin/benchmark")
    assert bench_res.status_code == 200
    bench = bench_res.json()
    assert bench["benchmark_summary"]["sensitivity"] == 1.0
    assert bench["ablation_comparison"]["avoided_false_positive_referrals_per_10k"] > 2000
