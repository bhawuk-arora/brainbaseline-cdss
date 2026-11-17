"""Unit tests for BrainBaseline mathematical engine."""

import math
import pytest
from packages.engine.baseline import compute_baseline, compute_all_baselines
from packages.engine.scoring import (
    compute_robust_z,
    compute_rci,
    update_cusum,
    compute_attention_rt_score,
    compute_memory_score,
    DomainScoreResult,
)
from packages.engine.context import evaluate_context, evaluate_confidence, ContextCheckinInput
from packages.engine.risk_tier import compute_risk_tier
from packages.engine.triage import evaluate_triage


def test_baseline_shrinkage_calculation():
    """Verify empirical Bayes shrinkage with k=4, N=3 sessions, s^2 sample variance."""
    # Scores: 10.0, 12.0, 14.0 -> Mean = 12.0, Median = 12.0
    # s^2 = ((10-12)^2 + (12-12)^2 + (14-12)^2) / 2 = (4 + 0 + 4) / 2 = 4.0
    # pop_sd = 2.0 -> sigma_pop^2 = 4.0
    # Shrunk variance = (2 * 4.0 + 4 * 4.0) / (2 + 4) = (8 + 16) / 6 = 24 / 6 = 4.0
    # SD_i = sqrt(4.0) = 2.0
    res = compute_baseline(domain="sequence_av", raw_scores=[10.0, 12.0, 14.0], pop_sd=2.0, k=4.0)
    assert res.is_valid is True
    assert res.median == 12.0
    assert pytest.approx(res.sample_sd, 0.01) == 2.0
    assert pytest.approx(res.sd, 0.01) == 2.0


def test_baseline_low_sessions():
    """Baseline with fewer than 3 sessions must return is_valid=False."""
    res = compute_baseline(domain="memory", raw_scores=[12.0, 13.0], pop_sd=1.8, k=4.0)
    assert res.is_valid is False
    assert res.n_sessions == 2


def test_robust_z_score():
    """Verify z_{i,t} = (x - b_i) / SD_i."""
    z = compute_robust_z(raw_score=9.0, baseline_median=12.0, baseline_sd=2.0)
    assert z == -1.5


def test_reliable_change_index():
    """Verify RCI calculation and decline threshold at -1.96."""
    # pop_sd = 2.0, reliability = 0.85
    # SE_diff = sqrt(2) * 2.0 * sqrt(1 - 0.85) = 1.4142 * 2.0 * 0.3873 = 1.0954
    # raw = 8.0, baseline = 12.0 -> delta = -4.0
    # RCI = -4.0 / 1.0954 = -3.651 <= -1.96
    rci = compute_rci(raw_score=8.0, baseline_median=12.0, pop_sd=2.0, reliability=0.85)
    assert rci < -1.96


def test_cusum_drift_alarm():
    """Verify sequential one-sided CUSUM accumulating negative drift to alarm (h=4.0)."""
    s = 0.0
    # Session 5: z = -1.0 -> s = max(0, 0 - (-1.0) - 0.5) = 0.5
    s, alarm = update_cusum(s, z_score=-1.0, k=0.5, h=4.0)
    assert s == 0.5 and not alarm

    # Repeat severe negative deviations to exceed threshold 4.0
    for _ in range(4):
        s, alarm = update_cusum(s, z_score=-1.5, k=0.5, h=4.0)

    # 0.5 + 4 * (1.5 - 0.5) = 4.5 > 4.0
    assert s > 4.0
    assert alarm is True


def test_attention_rt_composite_score():
    """Verify Go/No-Go composite clamping and formula."""
    # median_rt_ms = 400.0, commission_errors = 2, rt_iqr_ms = 45.0
    # composite = 100 - (400/10) - (2*4) - (45/15) = 100 - 40 - 8 - 3 = 49.0
    score = compute_attention_rt_score(median_rt_ms=400.0, commission_errors=2, rt_iqr_ms=45.0)
    assert score == 49.0

    # Test lower bound clamp
    score_low = compute_attention_rt_score(median_rt_ms=1200.0, commission_errors=15, rt_iqr_ms=300.0)
    assert score_low == 0.0


def test_memory_recognition_score():
    """Verify net memory score: (hits - false_alarms) + 8."""
    # 8 hits, 0 false alarms -> 8 - 0 + 8 = 16.0
    assert compute_memory_score(8, 0) == 16.0
    # 4 hits, 2 false alarms -> 4 - 2 + 8 = 10.0
    assert compute_memory_score(4, 2) == 10.0
    # 0 hits, 8 false alarms -> -8 + 8 = 0.0
    assert compute_memory_score(0, 8) == 0.0


def test_context_evaluation():
    """Verify acute sleep dip (<5h) or mood distress flags context_affected."""
    ctx_sleep = ContextCheckinInput(sleep_hours=4.5)
    is_affected, reasons = evaluate_context(ctx_sleep)
    assert is_affected is True
    assert any("sleep" in r.lower() for r in reasons)

    ctx_normal = ContextCheckinInput(sleep_hours=7.5)
    is_affected, reasons = evaluate_context(ctx_normal)
    assert is_affected is False


def test_risk_tier_calculation():
    """Verify modifiable risk tiers and repeat intervals."""
    # 1 factor -> Low (repeat 365 days)
    res_low = compute_risk_tier(["hypertension"])
    assert res_low.tier == "low"
    assert res_low.repeat_days == 365

    # 4 factors -> Moderate (repeat 180 days)
    res_mod = compute_risk_tier(["hypertension", "diabetes", "smoking", "hearing_loss"])
    assert res_mod.tier == "moderate"
    assert res_mod.repeat_days == 180

    # High factors + genetic -> High (repeat 90 days)
    res_high = compute_risk_tier(["hypertension", "diabetes", "smoking", "hearing_loss", "family_history", "apoe4_carrier"])
    assert res_high.tier == "high"
    assert res_high.repeat_days == 90
