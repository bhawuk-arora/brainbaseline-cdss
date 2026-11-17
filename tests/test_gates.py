"""Integration and unit tests for 5-Gate clinical safety architecture and explainability guardrails."""

import pytest
from packages.engine.scoring import DomainScoreResult
from packages.engine.triage import evaluate_triage
from packages.engine.context import RedFlagInput, evaluate_context, ContextCheckinInput
from packages.explain.guardrails import (
    check_banned_words,
    sanitize_text,
    inject_disclaimer,
    MANDATORY_DISCLAIMER_EN,
    MANDATORY_DISCLAIMER_AR,
)
from packages.explain.templates import (
    generate_participant_summary,
    generate_clinician_summary,
    select_tailored_actions,
)


def test_gate_2_red_flag_emergency_bypass():
    """Verify 100% bypass of cognitive math on acute red flags."""
    rf = RedFlagInput(sudden_confusion=True)
    assert rf.any_flag() is True

    # Orchestrator calls evaluate_triage with urgent_emergency=True
    triage = evaluate_triage(
        domain_results={},
        has_valid_baseline=True,
        context_affected=False,
        function_worse=False,
        urgent_emergency=True,
    )
    assert triage.color == "red"
    assert triage.urgent_emergency is True
    assert triage.held_for_review is False
    assert triage.repeat_days == 0
    assert "Urgent neurological warning signs" in triage.reasons[0]


def test_building_baseline_gate():
    """Verify user with <3 valid baseline sessions is held in baseline building state."""
    triage = evaluate_triage(
        domain_results={},
        has_valid_baseline=False,
        context_affected=False,
        function_worse=False,
    )
    assert triage.color == "baseline"
    assert triage.held_for_review is False


def test_gate_3_context_confounding_routes_to_yellow():
    """Verify acute sleep dip causes z=-1.8 to be triaged as Yellow (10 days) instead of Orange/Red."""
    dom_res = {
        "memory": DomainScoreResult(
            domain="memory",
            raw_score=9.5,
            baseline_median=13.0,
            baseline_sd=1.8,
            robust_z=-1.94,
        ),
        "sequence_av": DomainScoreResult(domain="sequence_av", raw_score=11.5, robust_z=0.0),
        "attention_rt": DomainScoreResult(domain="attention_rt", raw_score=52.0, robust_z=0.0),
    }

    triage = evaluate_triage(
        domain_results=dom_res,
        has_valid_baseline=True,
        context_affected=True,  # e.g., sleep < 5h
        function_worse=False,
    )
    assert triage.color == "yellow"
    assert triage.held_for_review is False
    assert triage.repeat_days == 10


def test_gate_4_clean_persistent_decline_triggers_orange_held_gate_5():
    """Verify clean consecutive domain decline with functional worsening triggers Orange held for review."""
    dom_res = {
        "memory": DomainScoreResult(
            domain="memory",
            raw_score=9.5,
            baseline_median=13.0,
            baseline_sd=1.8,
            robust_z=-1.94,
        ),
        "sequence_av": DomainScoreResult(domain="sequence_av", raw_score=11.5, robust_z=0.0),
        "attention_rt": DomainScoreResult(domain="attention_rt", raw_score=52.0, robust_z=0.0),
    }

    triage = evaluate_triage(
        domain_results=dom_res,
        has_valid_baseline=True,
        context_affected=False,
        function_worse=True,
        prev_clean_flagged_domains=["memory"],  # Consecutive decline in memory!
    )
    assert triage.color == "orange"
    assert triage.held_for_review is True  # Gate 5 Hold active!
    assert "memory" in triage.domains_flagged


def test_gate_4_red_clinical_candidate_held_gate_5():
    """Verify severe single domain drop (z <= -2.5) triggers Red held for clinician review."""
    dom_res = {
        "memory": DomainScoreResult(
            domain="memory",
            raw_score=7.5,
            baseline_median=13.0,
            baseline_sd=1.8,
            robust_z=-3.05,
        ),
        "sequence_av": DomainScoreResult(domain="sequence_av", raw_score=11.5, robust_z=0.0),
        "attention_rt": DomainScoreResult(domain="attention_rt", raw_score=52.0, robust_z=0.0),
    }

    triage = evaluate_triage(
        domain_results=dom_res,
        has_valid_baseline=True,
        context_affected=False,
        function_worse=False,
    )
    assert triage.color == "red"
    assert triage.urgent_emergency is False
    assert triage.held_for_review is True


def test_banned_words_guardrail():
    """Verify scanner detects banned diagnostic words and rejects diagnostic claims."""
    unsafe_text = "This patient is diagnosed with mild cognitive impairment and dementia."
    has_banned, found = check_banned_words(unsafe_text)
    assert has_banned is True
    assert "diagnosed" in found
    assert "mild cognitive impairment" in found
    assert "dementia" in found

    # Arabic banned words
    unsafe_ar = "المريض يعاني من أعراض الخرف والزهايمر المبكر"
    has_banned_ar, found_ar = check_banned_words(unsafe_ar)
    assert has_banned_ar is True
    assert "الخرف" in found_ar or "خرف" in found_ar


def test_participant_templates_zero_banned_words():
    """Verify all generated participant summaries pass banned word filters and include disclaimers."""
    colors = ["baseline", "green", "yellow", "orange", "red"]
    languages = ["en", "ar"]

    for col in colors:
        for lang in languages:
            summary = generate_participant_summary(color=col, lang=lang)
            has_banned, found = check_banned_words(summary)
            assert not has_banned, f"Found banned words {found} in {col} ({lang})"

            # Must contain mandatory disclaimer
            disclaimer = MANDATORY_DISCLAIMER_AR if lang == "ar" else MANDATORY_DISCLAIMER_EN
            assert disclaimer in summary


def test_clinician_summary_structure():
    """Verify clinician CDS summary generation."""
    summary = generate_clinician_summary(
        user_name="Layla Al-Mansoori",
        color="orange",
        domain_deltas={"memory": -1.85, "sequence_av": -1.55, "attention_rt": -0.40},
        function_worse=True,
        context_affected=False,
        risk_tier="moderate",
        drift_detected=True,
    )
    assert "Layla Al-Mansoori" in summary
    assert "ORANGE" in summary
    assert "reversible" in summary.lower()
    has_banned, found = check_banned_words(summary)
    assert not has_banned


def test_tailored_actions_count():
    """Verify exactly 3 tailored actions returned."""
    actions_en = select_tailored_actions(["hypertension", "poor_sleep"], lang="en")
    assert len(actions_en) == 3

    actions_ar = select_tailored_actions(["physical_inactivity"], lang="ar")
    assert len(actions_ar) == 3
