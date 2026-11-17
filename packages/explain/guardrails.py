"""Safety guardrails: Banned diagnostic word verification and mandatory disclaimers."""

import json
from pathlib import Path
from typing import List, Tuple

# Load banned diagnostic words from data/triage_rules.json if available, or fall back to defaults
DEFAULT_BANNED_WORDS = [
    "alzheimer",
    "alzheimer's",
    "dementia",
    "diagnosed",
    "diagnosis",
    "mci",
    "mild cognitive impairment",
    "neurodegenerative",
    "senile",
    "خرف",
    "زهايمر",
    "تشخيص",
    "مرض عقلي",
]


def load_banned_words() -> List[str]:
    # Look for data/triage_rules.json relative to project root
    candidate_paths = [
        Path("data/triage_rules.json"),
        Path(__file__).resolve().parent.parent.parent / "data" / "triage_rules.json",
        Path("/app/data/triage_rules.json"),
    ]
    for p in candidate_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("banned_diagnostic_words", DEFAULT_BANNED_WORDS)
            except Exception:
                pass
    return DEFAULT_BANNED_WORDS


MANDATORY_DISCLAIMER_EN = (
    "BrainBaseline is a cognitive tracking tool designed to detect personal changes over time. "
    "It is not a medical device and does not assess any specific medical condition. "
    "Please consult a qualified physician for clinical evaluation."
)

MANDATORY_DISCLAIMER_AR = (
    "منصة BrainBaseline هي أداة رقمية لمتابعة التغيرات الإدراكية الفردية عبر الوقت. "
    "هذه الأداة ليست وسيلة طبية ولا تحدد أي حالة مرضية بعينها. "
    "يرجى استشارة الطبيب المؤهل لإجراء التقييم السريري الشامل."
)


def check_banned_words(text: str, custom_banned_words: List[str] = None) -> Tuple[bool, List[str]]:
    """
    Scans text for prohibited diagnostic terminology.
    Returns (has_banned_words, found_words_list).
    """
    banned = custom_banned_words or load_banned_words()
    lower_text = text.lower()
    found = []

    for word in banned:
        w_lower = word.lower()
        if w_lower in lower_text:
            found.append(word)

    return len(found) > 0, found


def sanitize_text(text: str, replacement: str = "[clinical observation]") -> str:
    """
    Replaces prohibited diagnostic terminology with neutral phrasing.
    """
    banned = load_banned_words()
    sanitized = text
    for word in banned:
        # Simple case-insensitive replacement
        import re
        sanitized = re.sub(re.escape(word), replacement, sanitized, flags=re.IGNORECASE)
    return sanitized


def inject_disclaimer(text: str, lang: str = "en") -> str:
    """
    Appends the non-negotiable regulatory disclaimer to text.
    """
    disclaimer = MANDATORY_DISCLAIMER_AR if lang == "ar" else MANDATORY_DISCLAIMER_EN
    if disclaimer in text:
        return text
    return f"{text}\n\n---\n{disclaimer}"
