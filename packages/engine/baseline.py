"""Baseline computation module.

Calculates within-person baseline using median of sessions 2-4 and
empirical Bayes shrinkage (k=4) toward population variance.
"""

from typing import Dict, List, Optional
import math
import numpy as np
from pydantic import BaseModel


class BaselineResult(BaseModel):
    domain: str
    median: float
    sd: float
    sample_sd: float
    n_sessions: int
    is_valid: bool


# Population priors from data/triage_rules.json
DEFAULT_POP_PARAMS: Dict[str, Dict[str, float]] = {
    "memory": {"pop_mean": 13.0, "pop_sd": 1.8, "reliability": 0.82, "safety_floor": 7.0},
    "sequence_av": {"pop_mean": 11.5, "pop_sd": 2.0, "reliability": 0.85, "safety_floor": 5.0},
    "attention_rt": {"pop_mean": 52.0, "pop_sd": 6.5, "reliability": 0.84, "safety_floor": 25.0},
}

SHRINKAGE_K: float = 4.0


def compute_baseline(
    domain: str,
    raw_scores: List[float],
    pop_sd: Optional[float] = None,
    k: float = SHRINKAGE_K,
) -> BaselineResult:
    """
    Computes within-person baseline from 3 valid baseline sessions (sessions 2, 3, 4).
    Expects 3 scores (after discarding practice session 1).

    b_i = median(x_{i,2}, x_{i,3}, x_{i,4})
    s_i^2 = (1 / 2) * sum_{t=2}^4 (x_{i,t} - x_bar)^2
    SD_i = sqrt((2 * s_i^2 + k * sigma_pop^2) / (2 + k))
    """
    if pop_sd is None:
        pop_sd = DEFAULT_POP_PARAMS.get(domain, {}).get("pop_sd", 2.0)

    n = len(raw_scores)
    if n < 3:
        # Not yet a valid 3-session baseline
        median_val = float(np.median(raw_scores)) if n > 0 else pop_sd
        return BaselineResult(
            domain=domain,
            median=median_val,
            sd=pop_sd,
            sample_sd=0.0,
            n_sessions=n,
            is_valid=False,
        )

    # Use first 3 valid baseline sessions
    baseline_vals = [float(x) for x in raw_scores[:3]]
    b_i = float(np.median(baseline_vals))
    mean_val = float(np.mean(baseline_vals))

    # Sample variance with degrees of freedom = n - 1 = 2
    sum_sq_diff = sum((x - mean_val) ** 2 for x in baseline_vals)
    s_i_sq = max(0.0, sum_sq_diff / 2.0)
    sample_sd = math.sqrt(s_i_sq)

    # Empirical Bayes shrinkage toward population variance
    # SD_i = sqrt((2 * s_i^2 + k * sigma_pop^2) / (2 + k))
    sigma_pop_sq = pop_sd ** 2
    shrunk_var = (2.0 * s_i_sq + k * sigma_pop_sq) / (2.0 + k)
    sd_i = math.sqrt(max(1e-6, shrunk_var))

    return BaselineResult(
        domain=domain,
        median=round(b_i, 3),
        sd=round(sd_i, 3),
        sample_sd=round(sample_sd, 3),
        n_sessions=n,
        is_valid=True,
    )


def compute_all_baselines(
    session_scores: List[Dict[str, float]],
    pop_params: Optional[Dict[str, Dict[str, float]]] = None,
    k: float = SHRINKAGE_K,
) -> Dict[str, BaselineResult]:
    """
    Computes baselines for all domains given a list of session score dicts.
    Assumes session_scores has practice session removed (or only contains baseline sessions 2, 3, 4).
    """
    params = pop_params or DEFAULT_POP_PARAMS
    domains = ["memory", "sequence_av", "attention_rt"]
    results = {}

    for dom in domains:
        scores = [s[dom] for s in session_scores if dom in s]
        pop_sd = params.get(dom, {}).get("pop_sd", 2.0)
        results[dom] = compute_baseline(dom, scores, pop_sd=pop_sd, k=k)

    return results
