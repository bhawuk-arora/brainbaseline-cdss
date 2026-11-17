"""Modifiable and genetic dementia risk stratification module."""

from typing import List, Dict, Any
from pydantic import BaseModel


class RiskFactorItem(BaseModel):
    id: str
    points: int
    name_en: str
    name_ar: str
    category: str  # "cardiovascular", "lifestyle", "sensory_sleep", "genetic"


class RiskTierResult(BaseModel):
    points: int
    tier: str  # "low", "moderate", "high"
    repeat_days: int
    factors: List[RiskFactorItem]


RISK_FACTOR_WEIGHTS: Dict[str, Dict[str, Any]] = {
    "hypertension": {"points": 1, "en": "Hypertension (elevated blood pressure)", "ar": "ارتفاع ضغط الدم", "cat": "cardiovascular"},
    "diabetes": {"points": 1, "en": "Type 2 diabetes / insulin resistance", "ar": "السكري من النوع الثاني", "cat": "cardiovascular"},
    "physical_inactivity": {"points": 1, "en": "Low physical activity (<150 mins/week)", "ar": "قلة النشاط البدني", "cat": "lifestyle"},
    "smoking": {"points": 1, "en": "Current smoking or tobacco use", "ar": "التدخين أو استهلاك التبغ", "cat": "lifestyle"},
    "high_alcohol": {"points": 1, "en": "High alcohol consumption", "ar": "استهلاك الكحول بمستويات مرتفعة", "cat": "lifestyle"},
    "hearing_loss": {"points": 1, "en": "Uncorrected hearing impairment", "ar": "ضعف السمع غير المصحح", "cat": "sensory_sleep"},
    "sleep_apnea": {"points": 1, "en": "Obstructive sleep apnea / frequent snoring", "ar": "انقطاع النفس الانسدادي أثناء النوم", "cat": "sensory_sleep"},
    "obesity": {"points": 1, "en": "Elevated BMI (>= 30)", "ar": "السمنة (مؤشر كتلة الجسم >= 30)", "cat": "lifestyle"},
    "depression": {"points": 1, "en": "History of treated or untreated depression", "ar": "تاريخ من الاكتئاب", "cat": "lifestyle"},
    "social_isolation": {"points": 1, "en": "Limited daily social interaction", "ar": "العزلة الاجتماعية", "cat": "lifestyle"},
    "family_history": {"points": 2, "en": "First-degree family history of cognitive decline", "ar": "تاريخ عائلي من الدرجة الأولى للتراجع الإدراكي", "cat": "genetic"},
    "apoe4_carrier": {"points": 2, "en": "APOE-ε4 allele carriage", "ar": "حامل للأليل الوراثي APOE-ε4", "cat": "genetic"},
}


def compute_risk_tier(active_factor_keys: List[str]) -> RiskTierResult:
    """
    Computes cumulative risk score and repeat interval:
    - 0-2 points: 'low' -> repeat 365 days
    - 3-5 points: 'moderate' -> repeat 180 days
    - >=6 points: 'high' -> repeat 90 days
    """
    matched_factors: List[RiskFactorItem] = []
    total_points = 0

    for key in set(active_factor_keys):
        info = RISK_FACTOR_WEIGHTS.get(key)
        if info:
            pts = info["points"]
            total_points += pts
            matched_factors.append(
                RiskFactorItem(
                    id=key,
                    points=pts,
                    name_en=info["en"],
                    name_ar=info["ar"],
                    category=info["cat"],
                )
            )

    if total_points <= 2:
        tier = "low"
        repeat_days = 365
    elif total_points <= 5:
        tier = "moderate"
        repeat_days = 180
    else:
        tier = "high"
        repeat_days = 90

    return RiskTierResult(
        points=total_points,
        tier=tier,
        repeat_days=repeat_days,
        factors=matched_factors,
    )
