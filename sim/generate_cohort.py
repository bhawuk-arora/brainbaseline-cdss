"""Cohort generation script for 2,000 synthetic participants across 6 trajectories.
Seed = 42 for reproducible benchmarking.
"""

import json
from pathlib import Path
from typing import List, Dict, Any
import numpy as np


TRAJECTORY_DISTRIBUTION = [
    ("stable", 0.70),
    ("slow_decline", 0.08),
    ("fast_decline", 0.02),
    ("sleep_mood_dip", 0.12),
    ("practice_only", 0.06),
    ("irregular", 0.02),
]

POP_MEANS = {"memory": 13.0, "sequence_av": 11.5, "attention_rt": 52.0}
POP_SDS = {"memory": 1.8, "sequence_av": 2.0, "attention_rt": 6.5}


def generate_cohort(
    n_users: int = 2000,
    n_sessions: int = 12,
    seed: int = 42,
    n_red_flags: int = 50,
) -> Dict[str, Any]:
    np.random.seed(seed)

    trajectories, weights = zip(*TRAJECTORY_DISTRIBUTION)
    assigned_trajectories = np.random.choice(trajectories, size=n_users, p=weights)

    languages = ["en", "ar"]
    age_bands = ["40-54", "55-69", "70+"]
    education_levels = ["low", "mid", "high"]

    # Education effect on raw scores (demonstrates why static population norms bias against low education)
    edu_shift = {"low": -1.2, "mid": 0.0, "high": +1.0}

    users: List[Dict[str, Any]] = []

    # Pick indices for the 50 red flag cases
    red_flag_user_indices = set(np.random.choice(n_users, size=n_red_flags, replace=False))

    for idx in range(n_users):
        u_id = f"sim_user_{idx:04d}"
        traj = str(assigned_trajectories[idx])
        lang = str(np.random.choice(languages, p=[0.5, 0.5]))
        age_b = str(np.random.choice(age_bands, p=[0.35, 0.45, 0.20]))
        edu = str(np.random.choice(education_levels, p=[0.25, 0.50, 0.25]))

        # Personal latent ability baseline
        shift = edu_shift[edu]
        user_true_baseline = {
            dom: POP_MEANS[dom] + shift + float(np.random.normal(0, POP_SDS[dom] * 0.75))
            for dom in ["memory", "sequence_av", "attention_rt"]
        }

        has_red_flag_injection = idx in red_flag_user_indices
        red_flag_session = int(np.random.randint(5, n_sessions + 1)) if has_red_flag_injection else -1

        sessions: List[Dict[str, Any]] = []

        # Functional status
        function_worse = False
        function_score = 0

        # CUSUM simulation memory
        cusum_states = {dom: 0.0 for dom in ["memory", "sequence_av", "attention_rt"]}

        for sess_num in range(1, n_sessions + 1):
            is_practice = (sess_num == 1)

            # Default context
            sleep_hours = float(np.random.uniform(6.5, 8.5))
            mood_positive = False
            illness = False
            new_med = False

            # Red flag check
            red_flags = {
                "sudden_confusion": False,
                "speech_trouble": False,
                "new_weakness": False,
                "recent_fall_head_injury": False,
            }

            if sess_num == red_flag_session:
                rf_type = np.random.choice(list(red_flags.keys()))
                red_flags[rf_type] = True

            # Domain score generation based on trajectory
            session_scores = {}
            for dom in ["memory", "sequence_av", "attention_rt"]:
                base = user_true_baseline[dom]
                noise = float(np.random.normal(0, POP_SDS[dom] * 0.25))

                # Practice effect at session 1
                if is_practice:
                    score = base - (POP_SDS[dom] * 0.5) + noise
                elif sess_num in [2, 3, 4]:
                    # Baseline calibration sessions
                    score = base + noise
                else:
                    # Monitoring sessions 5-12
                    t_offset = sess_num - 4

                    if traj == "stable":
                        score = base + noise

                    elif traj == "slow_decline":
                        # Starts declining slowly from session 5 onwards
                        decline_mag = (t_offset * 0.32) * POP_SDS[dom]
                        score = base - decline_mag + noise
                        if sess_num >= 8:
                            function_worse = True
                            function_score = min(16, function_score + 1)

                    elif traj == "fast_decline":
                        # Rapid decline
                        decline_mag = (t_offset * 0.75) * POP_SDS[dom]
                        score = base - decline_mag + noise
                        if sess_num >= 6:
                            function_worse = True
                            function_score = min(16, 4 + t_offset)

                    elif traj == "sleep_mood_dip":
                        # Acute dip at session 6 or 9 affecting attention and memory
                        if sess_num in [6, 9]:
                            sleep_hours = float(np.random.uniform(3.2, 4.8))
                            mood_positive = bool(np.random.choice([True, False]))
                            if dom in ["attention_rt", "memory"]:
                                dip_mag = float(np.random.uniform(1.2, 1.4)) * POP_SDS[dom]
                                score = base - dip_mag + noise
                            else:
                                score = base + noise
                        else:
                            score = base + noise

                    elif traj == "practice_only":
                        # Continued mild improvement plateauing
                        score = base + min(0.6 * POP_SDS[dom], t_offset * 0.1 * POP_SDS[dom]) + noise

                    elif traj == "irregular":
                        # High erratic variance
                        high_noise = float(np.random.normal(0, POP_SDS[dom] * 0.65))
                        score = base + high_noise
                    else:
                        score = base + noise

                # Domain boundaries
                if dom == "memory":
                    score = max(0.0, min(16.0, score))
                elif dom == "sequence_av":
                    score = max(0.0, min(16.0, score))
                elif dom == "attention_rt":
                    score = max(0.0, min(100.0, score))

                session_scores[dom] = round(score, 2)

            sessions.append({
                "session_number": sess_num,
                "is_practice": is_practice,
                "scores": session_scores,
                "context": {
                    "sleep_hours": round(sleep_hours, 1),
                    "mood_positive": mood_positive,
                    "illness": illness,
                    "new_medication": new_med,
                },
                "red_flags": red_flags,
                "function_score": function_score,
                "function_worse": function_worse,
            })

        users.append({
            "user_id": u_id,
            "trajectory": traj,
            "language": lang,
            "age_band": age_b,
            "education": edu,
            "has_red_flag_injection": has_red_flag_injection,
            "red_flag_session": red_flag_session,
            "sessions": sessions,
        })

    return {
        "metadata": {
            "n_users": n_users,
            "n_sessions": n_sessions,
            "seed": seed,
            "n_red_flags": n_red_flags,
            "trajectory_distribution": dict(TRAJECTORY_DISTRIBUTION),
        },
        "cohort": users,
    }


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent
    data = generate_cohort()
    out_file = out_dir / "cohort.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Generated {len(data['cohort'])} synthetic users at {out_file}")
