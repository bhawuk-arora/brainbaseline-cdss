"""Context and data completeness evaluation module."""

from typing import Optional
from pydantic import BaseModel


class ContextCheckinInput(BaseModel):
    sleep_hours: float = 7.0
    mood_positive: bool = False  # True indicates positive mood dip/stress/anxiety screen
    illness: bool = False
    new_medication: bool = False
    pain: bool = False
    distraction: bool = False


class RedFlagInput(BaseModel):
    sudden_confusion: bool = False
    speech_trouble: bool = False
    new_weakness: bool = False
    recent_fall_head_injury: bool = False

    def any_flag(self) -> bool:
        return (
            self.sudden_confusion
            or self.speech_trouble
            or self.new_weakness
            or self.recent_fall_head_injury
        )


def evaluate_context(context: ContextCheckinInput) -> tuple[bool, list[str]]:
    """
    Evaluates whether a session's cognitive performance is confounded by acute context.
    context_affected = (sleep_hours < 5.0) or mood_positive or illness or new_medication or pain or distraction
    """
    reasons = []
    if context.sleep_hours < 5.0:
        reasons.append(f"Insufficient sleep ({context.sleep_hours:.1f} hrs < 5.0 hrs)")
    if context.mood_positive:
        reasons.append("Reported acute emotional distress, low mood, or anxiety")
    if context.illness:
        reasons.append("Reported acute systemic illness or infection")
    if context.new_medication:
        reasons.append("Recent change or addition to sedating/prescription medications")
    if context.pain:
        reasons.append("Reported acute pain interfering with focus")
    if context.distraction:
        reasons.append("Reported high environmental distraction during testing")

    is_affected = len(reasons) > 0
    return is_affected, reasons


def evaluate_confidence(has_function_report: bool, has_risk_profile: bool) -> str:
    """
    Evaluates data completeness:
    - 'high': both function report and risk profile exist
    - 'medium': one exists
    - 'low': neither exists
    """
    if has_function_report and has_risk_profile:
        return "high"
    elif has_function_report or has_risk_profile:
        return "medium"
    else:
        return "low"
