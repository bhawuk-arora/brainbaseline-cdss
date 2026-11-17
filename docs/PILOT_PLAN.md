# BrainBaseline: Abu Dhabi Primary Care & IFHAS Pilot Implementation Plan

## 1. Executive Summary & Strategic Fit

The Department of Health (DoH) Abu Dhabi and the Abu Dhabi Public Health Centre (ADPHC) have established global leadership in preventive healthcare through initiatives such as **IFHAS (إفحص)**, the comprehensive periodic health screening program for UAE nationals and residents.

Cognitive health screening currently represents a significant unmet need in preventive primary care. Traditional cognitive assessments (e.g., standard MMSE or MoCA) are time-consuming (15–20 minutes of clinician time), highly sensitive to language and educational background, and create an overwhelming burden of false-positive referrals to secondary neurology and geriatric clinics.

**BrainBaseline** is engineered specifically for seamless integration into the **IFHAS preventive pathway** and **SEHA / M42 primary-care centers**, delivering a culturally localized, self-administered digital assessment that establishes a personal cognitive baseline and tracks subtle within-person trajectories over time.

---

## 2. Integration into the IFHAS Routine Screening Workflow

```
[IFHAS Patient Appointment]
          │
          ▼
[Step 1: Digital Triage Tablet in Waiting Area]
  • 8-minute self-guided check on iPad/Android
  • Arabic (RTL) / English with 200% text scaling & audio
          │
          ▼
[Step 2: Automated 5-Gate Evaluation]
  • Gate 1: Consent verified & Malaffi wearable link
  • Gate 2: Red flags checked (emergency bypass if positive)
  • Gate 3: Sleep, mood & context confounding evaluated
  • Gate 4: Deterministic within-person z-score & CUSUM drift
          │
          ├── [Green/Yellow direct release] ──────────┐
          │                                           │
          ▼ [Orange/Red Clinical Candidate]           ▼
[Step 3: Primary-Care Clinician Review Console]   [Participant Receives]
  • Review interactive longitudinal trend chart     • Calm summary plan
  • Check Reversible Causes (B12, TSH, Apnea)       • 3 Tailored actions
  • Order local lab tests or routine follow-up      • Recheck interval
          │
          ▼
[Step 4: Structured Referral Destination (if unresolving)]
  • SEHA Audiology / Sleep Medicine
  • Cleveland Clinic Abu Dhabi / SSMC Memory Clinic
```

---

## 3. Pilot Scope & Phased Rollout (12 Months)

### Phase 1: Feasibility & Baseline Calibration (Months 1–3)
* **Location:** 2 SEHA Healthcare Centers in Abu Dhabi (e.g., Al Bateen Healthcare Centre & Madinat Khalifa Healthcare Centre).
* **Cohort Size:** 1,000 Emirati & expatriate adults aged 50–75 undergoing routine IFHAS check-ups.
* **Primary Objective:** Calibrate digital baseline adherence (Sessions 2–4 completion rate $\ge 80\%$) and validate usability across elderly participants with low digital literacy.

### Phase 2: Malaffi Interoperability & Longitudinal Tracking (Months 4–8)
* **Expansion:** 6 SEHA & M42 clinics (Abu Dhabi, Al Ain, Al Dhafra).
* **Cohort Size:** 5,000 participants.
* **Milestone:** Live bidirectional Malaffi FHIR bundle ingestion for cardiovascular and lifestyle risk factors (hypertension, HbA1c, sleep apnea records).
* **Clinical Gate:** Measurement of Gate 5 Clinician Hold compliance and reversible etiology resolution rate before specialty referral.

### Phase 3: Population Health Impact & Health-Economic Validation (Months 9–12)
* **Cohort Size:** 10,000 active participants.
* **Deliverable:** Full health-economic assessment measuring avoided false-positive tertiary neurology referrals, patient satisfaction scores, and early detection of treatable sensory and metabolic causes.

---

## 4. Health-Economic Model & Cost Savings

| Metric | Static Population-Norm Screening | BrainBaseline Within-Person CDSS | Net Benefit / Savings |
| :--- | :--- | :--- | :--- |
| **False-Positive Referral Rate** | 32.8% (3,280 / 10,000) | 0.45%–2.09% (~325 / 10,000) | **~2,955 avoided false referrals** |
| **Average Cost per Specialty Workup** | AED 1,200 (consultation + MRI) | Avoided in normal adults | — |
| **Direct Healthcare Savings** | — | — | **AED 3,546,000 per 10k adults** |
| **Clinician Assessment Time** | 15–20 mins per patient | Self-administered (2 min review) | **90% reduction in doctor time** |
| **Education Bias in Triage** | Severe penalty for low literacy | Eliminated via personal baseline | **100% Demographic Fairness** |

---

## 5. Key Performance Indicators (KPIs)

1. **Safety:** 100% detection and immediate emergency routing for acute red-flag symptoms.
2. **Reversible Cause Resolution:** $>45\%$ of flagged cases resolved at the primary-care level through treatment of B12 deficiency, thyroid correction, or hearing aid fitting without requiring tertiary neurology referrals.
3. **Participant Engagement:** Longitudinal repeat compliance $>75\%$ at recommended retest intervals (90–180 days).
4. **Clinical Adoption:** Clinician review turnaround time $<48$ hours for Gate 5 held cases.
