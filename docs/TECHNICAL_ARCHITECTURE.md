# BrainBaseline: Technical & Mathematical Architecture

## 1. System Overview & The Within-Person Paradigm

Conventional single-snapshot cognitive screening tools (e.g., standard MMSE or MoCA cutoffs) suffer from an inherent **30–35% false-positive rate** in culturally, linguistically, and educationally diverse populations like the United Arab Emirates. When an individual with limited formal education scores lower than a Western population average, static norms misclassify them as impaired, creating unnecessary anxiety and flooding secondary neurology clinics with inappropriate referrals.

**BrainBaseline** resolves this clinical limitation through a **Within-Person Longitudinal Baseline**. Rather than comparing a participant against an arbitrary population norm, BrainBaseline calibrates each participant against their own historical performance over time.

```
                           ┌─────────────────────────────┐
                           │      Participant Check      │
                           └──────────────┬──────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [Gate 1: Consent]                              [Gate 2: Red Flags]
      Cognition & Malaffi Scope                      Sudden Neurological Signs
                  │                                               │
                  ▼                                               ▼
     [Gate 3: Context Filter]                         100% Emergency Bypass
   Sleep (<5h), Mood, Illness, Meds                       (Call 999)
                  │
                  ▼
    [Gate 4: Deterministic Math]
  Empirical Bayes Shrinkage (k=4)
   Robust Within-Person Z-Score
    Reliable Change Index (RCI)
   One-Sided CUSUM Drift Monitor
                  │
                  ▼
      [Gate 5: Clinician Hold]
  Orange / Red Held for Review
Reversible Etiology Workup (B12, TSH)
                  │
                  ▼
       [Personalized Output]
    Participant Released Plan
```

---

## 2. Mathematical Engine Specifications

### A. Empirical Bayes Shrinkage Calibration ($b_i, SD_i$)
* Session 1 is explicitly discarded (`is_practice=True`) to eliminate test unfamiliarity and practice noise.
* Three clean baseline calibration sessions (Sessions 2, 3, 4) establish the personal baseline:
  $$b_i = \text{median}(x_{i,2}, x_{i,3}, x_{i,4})$$
* To prevent artificially zero standard deviations from small sample sizes, within-person sample variance $s_i^2 = \frac{1}{2}\sum_{t=2}^4 (x_{i,t} - \bar{x}_i)^2$ is shrunken toward population variance $\sigma_{\text{pop}}^2$ using an Empirical Bayes shrinkage factor ($k = 4$):
  $$SD_i = \sqrt{\frac{2 s_i^2 + k\,\sigma_{\text{pop}}^2}{2 + k}}$$

### B. Robust Within-Person Z-Score
For monitoring sessions ($t \ge 5$):
$$z_{i,t} = \frac{x_{i,t} - b_i}{SD_i}$$

### C. Reliable Change Index (RCI)
Evaluates whether an observed drop exceeds measurement error:
$$RCI_{i,t} = \frac{x_{i,t} - b_i}{\sqrt{2}\,\sigma_{\text{pop}}\sqrt{1 - r_i}}$$
$$\text{reliable\_decline} = (RCI_{i,t} \le -1.96)$$
*(where $r_i$ is domain test-retest reliability: Memory $0.82$, Sequence $0.85$, Attention $0.84$).*

### D. Sequential Cumulative Sum (CUSUM) Downward Drift Detection
Detects subtle, insidious micro-declines across consecutive clean sessions:
$$S_{i,t} = \max\left(0,\; S_{i,t-1} - z_{i,t} - 0.5\right), \quad S_{i,4} = 0$$
$$\text{drift\_alarm} = (S_{i,t} > 4.0)$$

---

## 3. Five-Gate Clinical Safety Architecture

1. **Gate 1 — Consent Gate:** Confirms active consent for cognitive screening. Supports live revocation with immediate HTTP 403 enforcement.
2. **Gate 2 — Red-Flag Emergency Bypass Gate:** Checks for sudden confusion, speech difficulty, facial droop/limb weakness, or recent head trauma. If any flag is present, all cognitive math is bypassed; participant is routed immediately to 999 emergency evaluation.
3. **Gate 3 — Context & Data Completeness Gate:** Filters out acute confounding factors (sleep $<5.0$ hrs, mood distress, acute infection, new sedative prescriptions) and routes temporary dips to Yellow (repeat in 10 days) rather than false escalation.
4. **Gate 4 — Deterministic Longitudinal Triage:**
   * **Baseline:** $<3$ valid baseline sessions.
   * **Red Candidate:** Any domain $z \le -2.5$, $\ge 2$ domains with $z \le -1.5$ in clean session, or score below safety floor.
   * **Orange:** Persistent clean decline in same domain across consecutive sessions OR CUSUM drift alarm, paired with functional worsening or multi-domain decline.
   * **Yellow:** Context-confounded drop (repeat 10d) or isolated clean dip without functional impact (repeat 14d).
   * **Green:** All domains stable ($z > -1.5$) with no drift alarm.
5. **Gate 5 — Clinician Hold & Release Gate:**
   * Whenever a case is flagged Orange or Red (non-emergency), results are strictly held in the Clinician Review Queue.
   * The participant endpoint displays a calm holding notice and **never exposes** raw z-scores or diagnostic alarm labels until a licensed clinician reviews reversible etiologies and signs off.

---

## 4. Malaffi / FHIR Wearable Ingestion

BrainBaseline includes a native REST endpoint (`POST /api/import/fhir`) designed to ingest standard FHIR R4 DiagnosticReport / Observation resources or Malaffi Health Information Exchange bundles. Merged factors recalculate modifiable dementia risk tiers (Lancet Commission criteria) and log immutable audit trail events.
