"""Scoring module: Robust Z-Score, Reliable Change Index (RCI), and CUSUM drift detection."""

from typing import Optional
import math
from pydantic import BaseModel


class DomainScoreResult(BaseModel):
    domain: str
    raw_score: float
    baseline_median: Optional[float] = None
    baseline_sd: Optional[float] = None
    robust_z: Optional[float] = None
    rci: Optional[float] = None
    reliable_decline: bool = False
    cusum_s: float = 0.0
    drift_alarm: bool = False
    below_safety_floor: bool = False


def clamp(val: float, low: float, high: float) -> float:
    return max(low, min(high, val))


def compute_memory_score(hits: int, false_alarms: int) -> float:
    """
    Memory Recognition net score: (hits - false_alarms) in -8..+8, shifted by +8 -> 0..16.
    """
    net = float(hits - false_alarms)
    return round(clamp(net + 8.0, 0.0, 16.0), 2)


def compute_attention_rt_score(
    median_rt_ms: float,
    commission_errors: int,
    rt_iqr_ms: float,
) -> float:
    """
    Go/No-Go composite attention/processing index:
    clamp(100.0 - (median_rt_ms / 10.0) - (commission_errors * 4.0) - (rt_iqr_ms / 15.0), 0.0, 100.0)
    """
    composite = (
        100.0
        - (median_rt_ms / 10.0)
        - (float(commission_errors) * 4.0)
        - (rt_iqr_ms / 15.0)
    )
    return round(clamp(composite, 0.0, 100.0), 2)


def compute_robust_z(
    raw_score: float,
    baseline_median: float,
    baseline_sd: float,
) -> float:
    """
    Robust z-score: z_{i,t} = (x_{i,t} - b_i) / SD_i
    """
    if baseline_sd <= 0:
        return 0.0
    return round((raw_score - baseline_median) / baseline_sd, 3)


def compute_rci(
    raw_score: float,
    baseline_median: float,
    pop_sd: float,
    reliability: float,
) -> float:
    """
    Reliable Change Index (RCI):
    SE_diff = sqrt(2) * sigma_pop * sqrt(1 - r_i)
    RCI = (x_{i,t} - b_i) / SE_diff
    """
    se_diff = math.sqrt(2.0) * pop_sd * math.sqrt(max(1e-4, 1.0 - reliability))
    if se_diff <= 0:
        return 0.0
    return round((raw_score - baseline_median) / se_diff, 3)


def update_cusum(
    prev_s: float,
    z_score: float,
    k: float = 0.5,
    h: float = 4.0,
) -> tuple[float, bool]:
    """
    One-sided downward CUSUM drift detection:
    S_{i,t} = max(0, S_{i,t-1} - z_{i,t} - k)
    drift_alarm = S_{i,t} > h
    """
    # Note: As performance declines, z_score becomes negative, so (- z_score - k) is positive
    curr_s = max(0.0, prev_s - z_score - k)
    alarm = curr_s > h
    return round(curr_s, 3), alarm
