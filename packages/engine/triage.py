"""Deterministic longitudinal triage engine."""

from typing import Dict, List, Optional
from pydantic import BaseModel
from .scoring import DomainScoreResult
from .baseline import DEFAULT_POP_PARAMS


class TriageResult(BaseModel):
    color: str  # "baseline", "green", "yellow", "orange", "red"
    urgent_emergency: bool = False
    held_for_review: bool = False
    reasons: List[str]
    repeat_days: int
    domains_flagged: List[str]


def evaluate_triage(
    domain_results: Dict[str, DomainScoreResult],
    has_valid_baseline: bool,
    context_affected: bool,
    function_worse: bool,
    prev_clean_flagged_domains: Optional[List[str]] = None,
    pop_params: Optional[Dict[str, Dict[str, float]]] = None,
    urgent_emergency: bool = False,
) -> TriageResult:
    """
    Applies deterministic longitudinal triage rules according to Part 3 specification:

    0. Urgent Red-Flag Emergency bypass:
       color = "red", urgent_emergency = True, held_for_review = False, repeat_days = 0.
    1. Building Baseline:
       Fewer than 3 valid baseline sessions -> color = "baseline", held_for_review = False, repeat_days = 30.
    2. Red Clinical Candidate:
       Any domain z <= -2.5 OR >= 2 domains with z <= -1.5 OR any raw score <= safety_floor
       -> color = "red", held_for_review = True, repeat_days = 14.
    3. Orange:
       context_affected == False
       AND (same domain z <= -1.5 in 2 consecutive clean sessions OR drift_alarm == True)
       AND (function_worse == True OR >= 2 domains showing decline/drift)
       -> color = "orange", held_for_review = True, repeat_days = 30.
    4. Yellow:
       Any domain z <= -1.5 during context_affected == True (repeat 10 days)
       OR single domain z <= -1.5 in clean session with function_worse == False (repeat 14 days)
       -> color = "yellow", held_for_review = False.
    5. Green:
       All domains z > -1.5 and no drift alarm -> color = "green", held_for_review = False, repeat_days = 90.
    """
    # 0. Red-Flag Emergency Bypass
    if urgent_emergency:
        return TriageResult(
            color="red",
            urgent_emergency=True,
            held_for_review=False,
            reasons=["Urgent neurological warning signs detected requiring immediate medical attention."],
            repeat_days=0,
            domains_flagged=[],
        )

    # 1. Building Baseline
    if not has_valid_baseline:
        return TriageResult(
            color="baseline",
            urgent_emergency=False,
            held_for_review=False,
            reasons=["Establishing personal cognitive baseline (sessions 2-4 required)."],
            repeat_days=30,
            domains_flagged=[],
        )

    params = pop_params or DEFAULT_POP_PARAMS
    prev_clean_flags = set(prev_clean_flagged_domains or [])

    # Extract domain metrics
    flagged_z_1_5 = []
    flagged_z_2_5 = []
    flagged_safety_floor = []
    drift_domains = []
    rci_decline_domains = []

    for dom_name, res in domain_results.items():
        z = res.robust_z if res.robust_z is not None else 0.0
        floor = params.get(dom_name, {}).get("safety_floor", 0.0)

        if res.raw_score <= floor:
            flagged_safety_floor.append(dom_name)
        if z <= -2.5:
            flagged_z_2_5.append(dom_name)
        if z <= -1.5:
            flagged_z_1_5.append(dom_name)
        if res.drift_alarm:
            drift_domains.append(dom_name)
        if res.reliable_decline:
            rci_decline_domains.append(dom_name)

    # 2. Red Clinical Candidate
    # Any domain z <= -2.5, OR >= 2 domains with z <= -1.5 in a clean session, OR raw score <= safety floor
    is_red = (
        len(flagged_z_2_5) > 0
        or (len(flagged_z_1_5) >= 2 and not context_affected)
        or len(flagged_safety_floor) > 0
    )
    if is_red:
        reasons = []
        if flagged_z_2_5:
            reasons.append(f"Pronounced personal deviation (z <= -2.5) in: {', '.join(flagged_z_2_5)}")
        if len(flagged_z_1_5) >= 2:
            reasons.append(f"Multi-domain deviation (z <= -1.5) in: {', '.join(flagged_z_1_5)}")
        if flagged_safety_floor:
            reasons.append(f"Score dropped below clinical safety floor in: {', '.join(flagged_safety_floor)}")

        all_red_domains = list(set(flagged_z_2_5 + flagged_z_1_5 + flagged_safety_floor))
        return TriageResult(
            color="red",
            urgent_emergency=False,
            held_for_review=True,
            reasons=reasons,
            repeat_days=14,
            domains_flagged=all_red_domains,
        )

    # Check for consecutive clean decline in same domain
    consecutive_clean_decline = False
    consecutive_domains = []
    if not context_affected:
        for d in flagged_z_1_5:
            if d in prev_clean_flags:
                consecutive_clean_decline = True
                consecutive_domains.append(d)

    has_drift = len(drift_domains) > 0

    # 3. Orange
    # context_affected == False AND (consecutive_clean_decline OR drift_alarm) AND (function_worse OR >= 2 domains showing decline/drift)
    decline_drift_pool = set(flagged_z_1_5 + drift_domains)
    is_orange = (
        not context_affected
        and (consecutive_clean_decline or has_drift)
        and (function_worse or len(decline_drift_pool) >= 2)
    )

    if is_orange:
        reasons = []
        if consecutive_clean_decline:
            reasons.append(f"Persistent clean decline across consecutive checks in: {', '.join(consecutive_domains)}")
        if has_drift:
            reasons.append(f"Longitudinal cumulative drift alarm (CUSUM > 4.0) in: {', '.join(drift_domains)}")
        if function_worse:
            reasons.append("Reported functional changes in everyday activities")
        if len(decline_drift_pool) >= 2:
            reasons.append(f"Multiple domains showing decline or drift: {', '.join(decline_drift_pool)}")

        return TriageResult(
            color="orange",
            urgent_emergency=False,
            held_for_review=True,
            reasons=reasons,
            repeat_days=30,
            domains_flagged=list(decline_drift_pool),
        )

    # 4. Yellow
    # Any domain z <= -1.5 during context_affected == True (repeat 10 days)
    # OR single domain z <= -1.5 in clean session with function_worse == False (repeat 14 days)
    if len(flagged_z_1_5) > 0 or has_drift:
        if context_affected:
            return TriageResult(
                color="yellow",
                urgent_emergency=False,
                held_for_review=False,
                reasons=[f"Temporary deviation in {', '.join(flagged_z_1_5)} likely confounded by acute context (insufficient sleep, illness, or distress). Repeat check in 10 days."],
                repeat_days=10,
                domains_flagged=flagged_z_1_5,
            )
        else:
            return TriageResult(
                color="yellow",
                urgent_emergency=False,
                held_for_review=False,
                reasons=[f"Isolated single-domain change in {', '.join(flagged_z_1_5)} without functional impact. Repeat check in 14 days."],
                repeat_days=14,
                domains_flagged=flagged_z_1_5,
            )

    # 5. Green
    return TriageResult(
        color="green",
        urgent_emergency=False,
        held_for_review=False,
        reasons=["All cognitive domains remain consistent with your personal baseline."],
        repeat_days=90,
        domains_flagged=[],
    )
