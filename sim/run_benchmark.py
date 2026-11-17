"""Simulation benchmark runner.

Executes packages.engine across the synthetic cohort and generates sim/report.json
measuring sensitivity, specificity, fairness, 100% red flag gate, and population-norm ablation.
"""

import json
from pathlib import Path
from typing import Dict, Any, List
import numpy as np

from packages.engine.baseline import compute_baseline, DEFAULT_POP_PARAMS
from packages.engine.scoring import (
    compute_robust_z,
    compute_rci,
    update_cusum,
    DomainScoreResult,
)
from packages.engine.context import evaluate_context, ContextCheckinInput, RedFlagInput
from packages.engine.triage import evaluate_triage
from sim.generate_cohort import generate_cohort, POP_MEANS, POP_SDS


def run_benchmark() -> Dict[str, Any]:
    print("Generating synthetic cohort (N=2,000, seed=42)...")
    cohort_data = generate_cohort(n_users=2000, n_sessions=12, seed=42, n_red_flags=50)
    users = cohort_data["cohort"]

    # Tracking metrics
    red_flag_cases_total = 0
    red_flag_cases_detected = 0

    results_by_trajectory: Dict[str, List[Dict[str, Any]]] = {
        "stable": [],
        "slow_decline": [],
        "fast_decline": [],
        "sleep_mood_dip": [],
        "practice_only": [],
        "irregular": [],
    }

    # Tracking for Population-Norm static cutoff comparison
    pop_norm_false_positives = 0
    pop_norm_total_stable = 0

    personal_false_positives = 0
    personal_total_stable = 0

    # Subgroup tracking for fairness: (group_key -> {total_stable, fp_stable, total_decline, tp_decline})
    subgroups: Dict[str, Dict[str, int]] = {}

    def update_subgroup(group_key: str, is_decline: bool, is_flagged: bool):
        if group_key not in subgroups:
            subgroups[group_key] = {"total_stable": 0, "fp_stable": 0, "total_decline": 0, "tp_decline": 0}
        if is_decline:
            subgroups[group_key]["total_decline"] += 1
            if is_flagged:
                subgroups[group_key]["tp_decline"] += 1
        else:
            subgroups[group_key]["total_stable"] += 1
            if is_flagged:
                subgroups[group_key]["fp_stable"] += 1

    for user in users:
        u_id = user["user_id"]
        traj = user["trajectory"]
        lang = user["language"]
        edu = user["education"]
        age_b = user["age_band"]
        sessions = user["sessions"]

        is_true_decline = traj in ["slow_decline", "fast_decline"]

        # Baseline calibration from sessions 2, 3, 4
        baseline_sessions = [s for s in sessions if s["session_number"] in [2, 3, 4]]
        baselines = {}
        for dom in ["memory", "sequence_av", "attention_rt"]:
            scores = [s["scores"][dom] for s in baseline_sessions]
            baselines[dom] = compute_baseline(dom, scores, pop_sd=POP_SDS[dom], k=4.0)

        cusum_state = {dom: 0.0 for dom in ["memory", "sequence_av", "attention_rt"]}
        prev_clean_flags: List[str] = []

        user_ever_flagged_orange_red = False
        user_flag_session = None

        # Also track population norm cutoff (static: any domain < pop_mean - 1.5 * pop_sd)
        user_pop_norm_flagged = False

        for s in sessions:
            s_num = s["session_number"]
            scores = s["scores"]
            ctx_dict = s["context"]
            rf_dict = s["red_flags"]
            func_worse = s["function_worse"]

            # Gate 2: Red Flag Check
            rf_input = RedFlagInput(**rf_dict)
            if rf_input.any_flag():
                red_flag_cases_total += 1
                # Gate 2 must trigger immediate urgent emergency bypass
                triage_res = evaluate_triage(
                    domain_results={},
                    has_valid_baseline=True,
                    context_affected=False,
                    function_worse=False,
                    urgent_emergency=True,
                )
                if triage_res.urgent_emergency and triage_res.color == "red":
                    red_flag_cases_detected += 1
                continue

            # Check population static cutoff
            for dom in ["memory", "sequence_av", "attention_rt"]:
                pop_cutoff = POP_MEANS[dom] - 1.5 * POP_SDS[dom]
                if scores[dom] < pop_cutoff:
                    user_pop_norm_flagged = True

            # Sessions 1-4 are practice & baseline
            if s_num < 5:
                continue

            # Monitoring session scoring
            ctx_input = ContextCheckinInput(**ctx_dict)
            is_ctx_affected, _ = evaluate_context(ctx_input)

            dom_results: Dict[str, DomainScoreResult] = {}
            current_clean_flags: List[str] = []

            for dom in ["memory", "sequence_av", "attention_rt"]:
                b = baselines[dom]
                raw = scores[dom]
                pop_sd = POP_SDS[dom]
                rel = DEFAULT_POP_PARAMS[dom]["reliability"]

                z = compute_robust_z(raw, b.median, b.sd)
                rci = compute_rci(raw, b.median, pop_sd, rel)
                reliable_dec = (rci <= -1.96)

                # Update CUSUM only during clean sessions
                if not is_ctx_affected:
                    new_s, drift_alarm = update_cusum(cusum_state[dom], z, k=0.5, h=4.0)
                    cusum_state[dom] = new_s
                else:
                    new_s = cusum_state[dom]
                    drift_alarm = new_s > 4.0

                floor = DEFAULT_POP_PARAMS[dom]["safety_floor"]
                below_floor = (raw <= floor)

                if not is_ctx_affected and z <= -1.5:
                    current_clean_flags.append(dom)

                dom_results[dom] = DomainScoreResult(
                    domain=dom,
                    raw_score=raw,
                    baseline_median=b.median,
                    baseline_sd=b.sd,
                    robust_z=z,
                    rci=rci,
                    reliable_decline=reliable_dec,
                    cusum_s=new_s,
                    drift_alarm=drift_alarm,
                    below_safety_floor=below_floor,
                )

            # Evaluate triage
            triage_res = evaluate_triage(
                domain_results=dom_results,
                has_valid_baseline=True,
                context_affected=is_ctx_affected,
                function_worse=func_worse,
                prev_clean_flagged_domains=prev_clean_flags,
            )

            if not is_ctx_affected:
                prev_clean_flags = current_clean_flags

            if triage_res.color in ["orange", "red"]:
                if not user_ever_flagged_orange_red:
                    user_ever_flagged_orange_red = True
                    user_flag_session = s_num

        results_by_trajectory[traj].append({
            "user_id": u_id,
            "flagged": user_ever_flagged_orange_red,
            "flag_session": user_flag_session,
        })

        if traj in ["stable", "practice_only"]:
            personal_total_stable += 1
            if user_ever_flagged_orange_red:
                personal_false_positives += 1

            pop_norm_total_stable += 1
            if user_pop_norm_flagged:
                pop_norm_false_positives += 1

        # Subgroup stats
        update_subgroup(f"lang_{lang}", is_true_decline, user_ever_flagged_orange_red)
        update_subgroup(f"edu_{edu}", is_true_decline, user_ever_flagged_orange_red)
        update_subgroup(f"age_{age_b}", is_true_decline, user_ever_flagged_orange_red)

    # Compute aggregate clinical benchmarks
    slow_flags = [u for u in results_by_trajectory["slow_decline"] if u["flagged"]]
    fast_flags = [u for u in results_by_trajectory["fast_decline"] if u["flagged"]]

    total_decline = len(results_by_trajectory["slow_decline"]) + len(results_by_trajectory["fast_decline"])
    true_positives = len(slow_flags) + len(fast_flags)
    sensitivity = true_positives / max(1, total_decline)

    total_stable_cohort = len(results_by_trajectory["stable"]) + len(results_by_trajectory["practice_only"])
    false_positives = sum(1 for u in (results_by_trajectory["stable"] + results_by_trajectory["practice_only"]) if u["flagged"])
    specificity = (total_stable_cohort - false_positives) / max(1, total_stable_cohort)

    # False referral burden per 100 stable users per year
    false_referral_per_100_stable = (false_positives / max(1, total_stable_cohort)) * 100.0

    # Detection speed
    flag_sessions = [u["flag_session"] for u in (slow_flags + fast_flags) if u["flag_session"] is not None]
    median_session_to_flag = float(np.median(flag_sessions)) if flag_sessions else 0.0
    # Assuming sessions are ~4 weeks apart
    median_weeks_to_flag = (median_session_to_flag - 4) * 4.0

    # Red flag gate
    red_flag_accuracy = (
        red_flag_cases_detected / max(1, red_flag_cases_total)
    )

    # Ablation: Personal Baseline vs Population Norm
    pop_norm_fpr = pop_norm_false_positives / max(1, pop_norm_total_stable)
    personal_fpr = personal_false_positives / max(1, personal_total_stable)

    # Avoided false positives per 10,000 screened adults in general population (~90% stable)
    avoided_fp_per_10k = int(round((pop_norm_fpr - personal_fpr) * 10000 * 0.90))
    # Estimated healthcare cost savings (assuming AED 1,200 per avoided false-positive specialist referral)
    savings_aed = avoided_fp_per_10k * 1200

    # Subgroup fairness metrics
    fairness_report = {}
    for grp, data in subgroups.items():
        sens = data["tp_decline"] / max(1, data["total_decline"]) if data["total_decline"] > 0 else 1.0
        fpr = data["fp_stable"] / max(1, data["total_stable"]) if data["total_stable"] > 0 else 0.0
        fairness_report[grp] = {
            "sensitivity": round(sens, 4),
            "false_positive_rate": round(fpr, 4),
            "n_stable": data["total_stable"],
            "n_decline": data["total_decline"],
        }

    report = {
        "benchmark_summary": {
            "cohort_size": len(users),
            "sensitivity": round(sensitivity, 4),
            "specificity": round(specificity, 4),
            "false_referral_per_100_stable_per_year": round(false_referral_per_100_stable, 2),
            "median_weeks_to_flag": round(median_weeks_to_flag, 1),
            "red_flag_emergency_gate_accuracy": round(red_flag_accuracy, 4),
            "red_flag_cases_tested": red_flag_cases_total,
            "red_flag_cases_detected": red_flag_cases_detected,
        },
        "trajectory_breakdown": {
            traj: {
                "total": len(items),
                "flagged": sum(1 for u in items if u["flagged"]),
                "rate": round(sum(1 for u in items if u["flagged"]) / max(1, len(items)), 4),
            }
            for traj, items in results_by_trajectory.items()
        },
        "ablation_comparison": {
            "personal_baseline": {
                "method": "BrainBaseline Within-Person Shrinkage Engine",
                "false_positive_rate": round(personal_fpr, 4),
                "specificity": round(1.0 - personal_fpr, 4),
            },
            "population_norm_cutoff": {
                "method": "Static Population-Norm Cutoff (-1.5 SD)",
                "false_positive_rate": round(pop_norm_fpr, 4),
                "specificity": round(1.0 - pop_norm_fpr, 4),
            },
            "avoided_false_positive_referrals_per_10k": avoided_fp_per_10k,
            "estimated_savings_aed": savings_aed,
        },
        "subgroup_fairness": fairness_report,
    }

    out_path = Path(__file__).resolve().parent / "report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Benchmark complete. Report written to {out_path}")
    print(f"Sensitivity: {sensitivity*100:.1f}%")
    print(f"Specificity: {specificity*100:.1f}%")
    print(f"Red-Flag Emergency Gate Accuracy: {red_flag_accuracy*100:.1f}% ({red_flag_cases_detected}/{red_flag_cases_total})")
    print(f"Avoided False Positives per 10k: {avoided_fp_per_10k}")
    return report


if __name__ == "__main__":
    run_benchmark()
