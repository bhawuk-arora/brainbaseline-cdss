"""Deterministic plain-language bilingual templates for participants and clinicians."""

from typing import List, Dict, Any, Optional
from .guardrails import check_banned_words, inject_disclaimer

# Default lifestyle actions matching data/triage_rules.json
ACTION_CATALOG = [
    {
        "id": "act_sleep",
        "trigger": "poor_sleep",
        "en": "Keep a consistent 7–8 hour sleep schedule and avoid late caffeine.",
        "ar": "حافظ على جدول نوم منتظم لمدة 7-8 ساعات وتجنب الكافيين مساءً.",
    },
    {
        "id": "act_walk",
        "trigger": "physical_inactivity",
        "en": "Aim for 30 minutes of brisk walking 5 days a week.",
        "ar": "مارس المشي السريع لمدة 30 دقيقة 5 أيام في الأسبوع.",
    },
    {
        "id": "act_bp",
        "trigger": "hypertension",
        "en": "Review blood pressure and blood sugar targets at your next primary-care visit.",
        "ar": "راجع قراءات ضغط الدم والسكر في زيارتك القادمة للرعاية الأولية.",
    },
    {
        "id": "act_sensory",
        "trigger": "hearing_loss",
        "en": "Schedule a routine hearing and vision check-up.",
        "ar": "احجز موعداً لفحص السمع والنظر الدوري.",
    },
    {
        "id": "act_social",
        "trigger": "social_isolation",
        "en": "Stay socially connected and engage in mentally stimulating conversations or puzzles.",
        "ar": "حافظ على التواصل الاجتماعي والأنشطة الذهنية المحفزة.",
    },
    {
        "id": "act_stress",
        "trigger": "mood",
        "en": "Practice brief relaxation breathing or mindfulness when feeling stressed.",
        "ar": "مارس تمارين التنفس والاسترخاء عند الشعور بالإجهاد أو القلق.",
    },
]


def select_tailored_actions(triggers: List[str], lang: str = "en") -> List[str]:
    """
    Selects 3 tailored lifestyle actions based on active triggers (e.g. poor_sleep, hypertension).
    Falls back to core brain health actions to ensure exactly 3 actions are returned.
    """
    selected = []
    seen_ids = set()

    for act in ACTION_CATALOG:
        if act["trigger"] in triggers and act["id"] not in seen_ids:
            selected.append(act[lang])
            seen_ids.add(act["id"])
            if len(selected) == 3:
                return selected

    # Fill remaining from catalog
    for act in ACTION_CATALOG:
        if act["id"] not in seen_ids:
            selected.append(act[lang])
            seen_ids.add(act["id"])
            if len(selected) == 3:
                break

    return selected


def generate_participant_summary(
    color: str,
    urgent_emergency: bool = False,
    session_number: int = 1,
    reasons: Optional[List[str]] = None,
    context_affected: bool = False,
    lang: str = "en",
) -> str:
    """
    Generates deterministic, reassuring, non-diagnostic participant summaries in EN or AR.
    Enforces that zero banned words exist in the generated text.
    """
    reasons_list = reasons or []

    if urgent_emergency:
        if lang == "ar":
            text = (
                "تنبيه طبي طارئ: تم رصد علامات عصبية مفاجئة تتطلب عناية طبية فورية. "
                "يرجى الاتصال بالإسعاف (999) أو التوجه إلى أقرب قسم طوارئ في الحال."
            )
        else:
            text = (
                "URGENT MEDICAL NOTICE: Sudden neurological warning signs were reported. "
                "Please call 999 or proceed to the nearest emergency department immediately for urgent medical care."
            )
        return inject_disclaimer(text, lang)

    if color == "baseline":
        sessions_needed = max(1, 4 - session_number)
        if lang == "ar":
            text = (
                f"اكتملت جلسة الفحص بنجاح. نحن نعمل حالياً على بناء خط الأساس الإدراكي الشخصي الخاص بك "
                f"(الجلسة {session_number} من 4). يتبقى {sessions_needed} جلسة لإكمال خط الأساس المخصص."
            )
        else:
            text = (
                f"Your check-in is complete. We are currently establishing your personalized cognitive baseline "
                f"(session {session_number} of 4). {sessions_needed} more check-in is needed to finalize your reference."
            )
        return inject_disclaimer(text, lang)

    if color == "green":
        if lang == "ar":
            text = (
                "أداؤك اليوم مستقر ويتطابق تماماً مع خط الأساس المرجعي الخاص بك عبر كافة المقاييس. "
                "واصل اتباع عادات نمط الحياة الصحية مثل النشاط البدني المنتظم والنوم الجيد."
            )
        else:
            text = (
                "Your performance today is stable and consistent with your personal baseline across all areas. "
                "Keep up your healthy daily routines including physical activity, quality sleep, and social engagement."
            )
        return inject_disclaimer(text, lang)

    if color == "yellow":
        if context_affected:
            if lang == "ar":
                text = (
                    "لوحظ انخفاض طفيف ومؤقت اليوم مقارنة بخط أساسك المعتاد، وهو على الأرجح مرتبط بظروف "
                    "الإجهاد أو قلة النوم أو التعب البدني التي أشرت إليها. ننصحك بأخذ قسط كافٍ من الراحة "
                    "وإعادة الفحص بعد 10 أيام."
                )
            else:
                text = (
                    "A mild temporary dip was observed today relative to your usual baseline, which is likely related to "
                    "the sleep disruption, fatigue, or stress reported during check-in. We recommend resting well and "
                    "repeating the check in 10 days."
                )
        else:
            if lang == "ar":
                text = (
                    "لوحظ تذبذب طفيف في أحد المقاييس اليوم بينما ظلت الأنشطة اليومية ممتازة. "
                    "تحدث مثل هذه التغيرات الطبيعية من حين لآخر، ونوصي بإعادة الفحص بعد 14 يوماً للتأكد من استقرارك."
                )
            else:
                text = (
                    "A subtle variation was observed in one area today while your daily function remains unaffected. "
                    "Such minor variations are common; we recommend a routine repeat check in 14 days."
                )
        return inject_disclaimer(text, lang)

    if color == "orange":
        if lang == "ar":
            text = (
                "أظهرت مؤشرات اليوم تغيراً طفيفاً مستمراً يستحق المراجعة السريرية الروتينية. "
                "يقوم الطبيب المختص بمراجعة تقريرك حالياً للتحقق من الأسباب القابلة للعلاج مثل نقص الفيتامينات أو مشاكل النوم، "
                "وسيتم تزويدك بالخطة الطبية المعتمدة قريباً."
            )
        else:
            text = (
                "Today's indicators show a mild persistent change that warrants routine clinical review. "
                "A clinician is reviewing your longitudinal trend to check for reversible contributors such as vitamin levels "
                "or sleep patterns, and will provide your finalized plan shortly."
            )
        return inject_disclaimer(text, lang)

    if color == "red":
        if lang == "ar":
            text = (
                "أظهر التقييم تغيراً ملحوظاً عن خط أساسك الشخصي. تم إرسال التقرير فوراً إلى الفريق الطبي المختص "
                "لمراجعته وتحديد موعد لتقييم شامل مع طبيب الرعاية الأولية أو المختص."
            )
        else:
            text = (
                "Today's evaluation shows a notable change from your personal baseline. Your report has been prioritized "
                "for clinical team review to schedule a comprehensive follow-up with your primary-care physician."
            )
        return inject_disclaimer(text, lang)

    # Fallback
    text = "Check completed."
    return inject_disclaimer(text, lang)


def generate_clinician_summary(
    user_name: str,
    color: str,
    domain_deltas: Dict[str, float],
    function_worse: bool,
    context_affected: bool,
    risk_tier: str,
    drift_detected: bool = False,
) -> str:
    """
    Generates a structured clinical decision support summary for the clinician console.
    """
    delta_str = ", ".join(f"{k}: z={v:+.2f}" for k, v in domain_deltas.items())
    func_str = "Functional decline reported" if function_worse else "Functional independence intact"
    ctx_str = "Acute confounding present (sleep/illness/distress)" if context_affected else "No acute confounding"
    drift_str = "Longitudinal CUSUM drift alarm positive" if drift_detected else "No cumulative drift alarm"

    summary = (
        f"Participant: {user_name} | Longitudinal Triage: {color.upper()}\n"
        f"Domain Deviations: {delta_str}\n"
        f"Daily Function: {func_str} | Context: {ctx_str}\n"
        f"Trajectory Analysis: {drift_str} | Modifiable Risk Tier: {risk_tier.capitalize()}\n"
        f"Recommended Action: Review reversible etiologies (B12, thyroid, sleep apnea, medications) "
        f"prior to specialty escalation."
    )

    # Verify safety guardrails
    has_banned, banned = check_banned_words(summary)
    if has_banned:
        raise ValueError(f"Clinician summary contains prohibited words: {banned}")

    return summary
