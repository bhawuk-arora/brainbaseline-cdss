# 🧠 BrainBaseline: Clinical Decision Support System (CDSS)
### Longitudinal Within-Person Baseline Cognitive Health Screening Platform
*Aligned with the Department of Health (DoH) Abu Dhabi × Inception 42 × Hack2Skill Healthcare AI Hackathon*

[![CI Tests](https://img.shields.io/badge/pytest-25%20passed-emerald?style=flat-square&logo=pytest)](https://github.com/bhawuk-arora/brainbaseline-cdss)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%20WAL-teal?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Fairness](https://img.shields.io/badge/Fairness%20Gap-%3C0.2%25%20(AR%20vs%20EN)-indigo?style=flat-square)]()
[![Emergency Gate](https://img.shields.io/badge/Red--Flag%20Gate-100%25%20Bypass-rose?style=flat-square)]()

---

## 📑 Table of Contents
1. [The Executive Summary & Clinical Motive](#1-the-executive-summary--clinical-motive)
2. [What BrainBaseline Does (Product Overview)](#2-what-brainbaseline-does-product-overview)
3. [End-to-End System Architecture](#3-end-to-end-system-architecture)
4. [The 5-Gate Deterministic Safety Pipeline](#4-the-5-gate-deterministic-safety-pipeline)
5. [Mathematical & Statistical Core](#5-mathematical--statistical-core)
6. [Interactive Cognitive Tasks](#6-interactive-cognitive-tasks)
7. [The 5 Seeded Personas & Live Clinical Edge Cases](#7-the-5-seeded-personas--live-clinical-edge-cases)
8. [Developer Quick Start & Engineering Handbook](#8-developer-quick-start--engineering-handbook)
9. [REST API Contract & Integration Reference](#9-rest-api-contract--integration-reference)
10. [Health Economics & Abu Dhabi IFHAS Pilot Plan](#10-health-economics--abu-dhabi-ifhas-pilot-plan)
11. [Repository Map & Documentation Index](#11-repository-map--documentation-index)

---

## 1. The Executive Summary & Clinical Motive

### The Fundamental Problem in Cognitive Screening
Traditional cognitive screening devices (e.g., standard MMSE, MoCA, mini-cog) rely on **static population-norm cutoffs** established primarily in Western, college-educated cohorts. 

When deployed in culturally and linguistically diverse environments—such as the United Arab Emirates and broader GCC—these static cutoffs suffer from catastrophic clinical failure:
* **30%–35% False Positive Rate:** Normal older adults with limited formal schooling or non-native English backgrounds score below arbitrary threshold cutoffs, triggering false alarms.
* **Secondary Healthcare Overload:** An overwhelming wave of healthy adults is referred for expensive tertiary neurology consultations, MRI/PET neuroimaging, and biomarker tests.
* **Patient Harm & Anxiety:** Premature or implied neurodegenerative labels generate immense psychological distress before reversible physical conditions are ever checked.
* **Insensitivity to Insidious Micro-Decline:** A highly educated individual can experience significant neurocognitive decline while remaining technically "within the normal population range", delaying early intervention until irreversible damage occurs.

### The BrainBaseline Solution
BrainBaseline replaces the flawed population snapshot with a **Longitudinal Within-Person Baseline**:
1. **Calibrate Against Yourself:** Each participant builds an individualized mathematical baseline using Empirical Bayes shrinkage over initial clean sessions.
2. **Context-Aware Safety Filtering:** Acute sleep loss, systemic infections, distress, and medication side effects are caught upfront so temporary dips are never mistaken for neurodegeneration.
3. **Interactive Reversible-Cause Gate:** Mandates primary-care evaluation of treatable causes (vitamin B12, thyroid, sleep apnea, sensory deficit) before specialist referral.
4. **Gate 5 Clinician Hold:** No unverified Orange or Red flag is ever revealed to a participant until a licensed clinician reviews their trend and signs off.

---

## 2. What BrainBaseline Does (Product Overview)

BrainBaseline is a full-stack, enterprise-grade Clinical Decision Support System (CDSS) and patient-facing screening application comprising:

* **Patient-Facing Guided Experience (`/check` & `/result`):**
  * Bilingual, high-contrast, text-scalable (up to 200%) digital check-in designed for elderly participants.
  * Multi-modal cognitive tasks: **Word Recognition Memory**, a synthesized **4-Pad Audio-Visual Sequence Studio**, and an inhibition **Go/No-Go Reaction Speed Task**.
  * Context & 8-item daily living functional questionnaire.
  * Calm, non-alarmist feedback with 3 personalized lifestyle action steps.
* **Clinician Decision Console (`/clinician`):**
  * Pending review queue holding flagged cases.
  * Interactive SVG longitudinal trajectory chart with **shaded $\pm 1.5$ SD within-person baseline tolerance bands**.
  * Interactive **Reversible-Cause Checklist** (B12, TSH, sleep apnea, medications, sensory loss, mood).
  * 1-Click **Malaffi / FHIR Wearable Import** and structured UAE referral routing (Primary Care, Neurology, Audiology, Geriatrics).
* **Population Health & Governance Console (`/admin`):**
  * Real-time benchmark analytics on a validated 2,000-cohort simulation.
  * Demographic fairness audit table proving sub-0.2% disparity across Arabic and English.
  * **Health-Economic Impact Calculator** quantifying avoided false-positive specialist referrals and monetary savings for health systems.
  * Immutable, tamper-evident audit log ledger capturing all clinical interactions.

---

## 3. End-to-End System Architecture

```
[ BROWSER / CLINIC TABLET ] ── Next.js 14 (App Router, Tailwind, TypeScript)
       │
       ├── State Management: React Context (Bilingual EN/AR, RTL/LTR, Font Scale, Personas)
       ├── Web Audio API: Real-time sine tone synthesis (261Hz–523Hz)
       └── Web Speech API: Bilingual voice synthesis
       │
       ▼ (REST API / CORS)
[ BACKEND SERVICE ] ──────── FastAPI (Asynchronous Python 3.10+)
       │
       ├── models.py: 11 SQLModel / Pydantic Entities
       ├── database.py: SQLite with WAL (Write-Ahead-Logging) Mode & zero-lock concurrency
       │
       ▼ (Execution Flow)
[ 5-GATE ORCHESTRATOR ] ───── apps/api/orchestrator.py
       │
       ├── Gate 1: Consent Verification & Live Revocation
       ├── Gate 2: 100% Red-Flag Emergency Bypass Gate
       ├── Gate 3: Acute Context Confounder & Data Confidence Filter
       ├── Gate 4: Deterministic Longitudinal Shrinkage Engine
       └── Gate 5: Clinician Hold & Release Gate
       │
       ▼ (Internal Domain Libraries)
[ PACKAGES / CORE ENGINE ]
       ├── packages/engine/baseline.py   ── Empirical Bayes Shrinkage (k=4)
       ├── packages/engine/scoring.py    ── Robust Z-Score, RCI, CUSUM Drift
       ├── packages/engine/triage.py     ── Deterministic Triage Color Logic
       ├── packages/engine/risk_tier.py  ── Lancet Commission Modifiable Risk
       └── packages/explain/guardrails.py── Banned Diagnostic Term Filter
```

---

## 4. The 5-Gate Deterministic Safety Pipeline

In BrainBaseline, **generative AI / LLMs are never permitted to determine triage outcomes or clinical actions**. Triage is governed by a 5-Gate deterministic pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GATE 1: INFORMED CONSENT GATE                         │
│  Validates active consent for "cognition". Revocation yields HTTP 403.      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ PASSED
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 GATE 2: RED-FLAG EMERGENCY BYPASS GATE                      │
│  Checks: Sudden confusion, speech loss, new weakness, or acute head fall.  │
│  IF ANY TRUE ──► Bypasses cognitive math ──► Color: RED ──► Emergency 999   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ NO RED FLAGS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              GATE 3: CONTEXT CONFOUNDER & COMPLETENESS GATE                 │
│  Inspects: Sleep (<5.0h), acute infection, acute emotional stress, sedative │
│  medications. Evaluates Data Completeness (Risk Profile + Function Report). │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│            GATE 4: DETERMINISTIC LONGITUDINAL ENGINE & TRIAGE               │
│  • Baseline Mode (<3 clean sessions)                                        │
│  • Red Candidate (z <= -2.5 OR >=2 domains z <= -1.5 in clean session)      │
│  • Orange Candidate (Consecutive clean decline OR CUSUM drift + functional) │
│  • Yellow Context/Isolated Dip (Repeat in 10 or 14 days)                    │
│  • Green Stable (All domains z > -1.5, no drift alarm)                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  GATE 5: CLINICIAN HOLD & RELEASE GATE                      │
│  Orange / Red cases are placed in Clinician Review Queue (held_for_review). │
│  Participant sees calm holding screen. Release requires clinician sign-off. │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Mathematical & Statistical Core

### A. Empirical Bayes Shrinkage Baseline ($b_i, SD_i$)
* Session 1 is discarded (`is_practice=True`) to eliminate practice effects.
* Baseline is derived from Sessions 2, 3, and 4:
  $$b_i = \text{median}(x_{i,2}, x_{i,3}, x_{i,4})$$
* Within-person variance $s_i^2 = \frac{1}{2}\sum_{t=2}^4 (x_{i,t} - \bar{x}_i)^2$ is shrunk toward population variance $\sigma_{\text{pop}}^2$ using shrinkage factor $k=4$:
  $$SD_i = \sqrt{\frac{2 s_i^2 + k\,\sigma_{\text{pop}}^2}{2 + k}}$$
* *Why this matters:* Eliminates false zero standard deviations without requiring dozens of sessions.

### B. Robust Within-Person Z-Score
For all monitoring sessions ($t \ge 5$):
$$z_{i,t} = \frac{x_{i,t} - b_i}{SD_i}$$

### C. Reliable Change Index (RCI)
Evaluates whether a drop exceeds standard measurement error:
$$RCI_{i,t} = \frac{x_{i,t} - b_i}{\sqrt{2}\,\sigma_{\text{pop}}\sqrt{1 - r_i}}, \qquad \text{Decline Flag} = (RCI_{i,t} \le -1.96)$$
*(Population reliabilities: Memory $r=0.82$, Sequence $r=0.85$, Attention $r=0.84$).*

### D. Sequential Cumulative Sum (CUSUM) Downward Drift Detection
Evaluated across consecutive clean sessions:
$$S_{i,t} = \max\left(0,\; S_{i,t-1} - z_{i,t} - 0.5\right), \quad S_{i,4} = 0$$
$$\text{Drift Alarm Triggered} = (S_{i,t} > 4.0)$$

---

## 6. Interactive Cognitive Tasks

1. **Word Memory & Recognition Task:**
   * Form A–D concrete neutral nouns (8 study targets shown 2.0s each with Web Speech audio option $\to$ delayed 16-word recognition grid).
   * Net score: $\text{clamp}((\text{hits} - \text{false\_alarms}) + 8.0, 0.0, 16.0)$.
2. **4-Pad Audio-Visual Sequence Studio:**
   * 4-pad sequence recall studio testing escalating spans (Span 3 $\to$ Span 4 $\to$ Span 5).
   * Web Audio API synthesized tones: C4 ($261.63$ Hz), E4 ($329.63$ Hz), G4 ($392.00$ Hz), C5 ($523.25$ Hz) with exponential gain decay.
   * Disentangles visual vs. auditory memory pathways (`visual_acc`, `auditory_acc`).
3. **Attention & Inhibition Go/No-Go Task:**
   * Star (⭐ Tap immediately) vs. Circle (⭕ Inhibit / Do not tap).
   * Measures Median Reaction Time (`median_rt_ms`), Reaction Time IQR Variability (`rt_iqr_ms`), and Commission Errors.
   * Composite: $\text{clamp}(100.0 - (\text{RT}/10) - (\text{Errors}\times 4) - (\text{IQR}/15), 0.0, 100.0)$.
   * Includes a 10-trial Fast Demo mode for judge review.

---

## 7. The 5 Seeded Personas & Live Clinical Edge Cases

Every persona is seeded idempotently with deterministic IDs:

| Persona | Key Traits | Clinical Demonstration | Where Judges See It |
| :--- | :--- | :--- | :--- |
| **Layla Al-Mansoori** | 68F, Arabic/English, High Education | **Orange Candidate Held in Gate 5.** 6 sessions completed showing persistent memory/sequence drop and functional change. Held until released by clinician. | `/result` & `/clinician` |
| **Tariq Al-Nuaimi** | 58M, Arabic, Mid Education | **Yellow Acute Sleep Confounder.** Session 5 had severe sleep loss (3.5h). Gate 3 correctly routes to Yellow (repeat 10 days) without false dementia alarm. | `/result` |
| **Fatima Al-Ali** | 72F, Arabic, Low Formal Education | **Demographic Fairness Proof.** Static norms falsely flag her due to lower baseline schooling. BrainBaseline proves her within-person stability ($z \approx 0.0$), triaged as Green. | `/result` & `/admin` |
| **Omar Al-Husseini** | 64M, English/Arabic, Mid Education | **100% Emergency Gate Bypass.** Acute sudden confusion and speech trouble trigger immediate bypass to 999 instructions. | `/check` & `/result` |
| **Sara Al-Zaabi** | 49F, Arabic/English, Mid Education | **Baseline Calibration Mode.** Completed Session 2 of 4. System prompts participant that 2 more sessions are needed. | `/check` & `/result` |

---

## 8. Developer Quick Start & Engineering Handbook

### Prerequisites
* Python 3.10+
* Node.js 18+
* Docker & Docker Compose (optional for containerized boot)

### Option A: Local Dev Boot (Without Docker)

```bash
# 1. Clone the repository
git clone https://github.com/bhawuk-arora/brainbaseline-cdss.git
cd brainbaseline-cdss

# 2. Install Python Core Package in editable mode
pip install -e .

# 3. Run Pytest Verification Suite (25 tests across engine, gates, and API)
pytest -v

# 4. Run the 2,000-Cohort Simulation Benchmark
python sim/run_benchmark.py

# 5. Start the FastAPI Backend
uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload

# 6. In a separate terminal, start the Next.js Web Frontend
cd apps/web
npm install
npm run dev
```

* **Frontend:** [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if 3000 is occupied)
* **Backend API & Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Option B: One-Command Docker Compose Boot
```bash
docker compose up --build
```

---

## 9. REST API Contract & Integration Reference

All endpoints return strictly typed JSON schemas:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns service health status and version. |
| `GET` | `/api/users` | Lists all seeded personas with triage status and review flags. |
| `GET` | `/api/users/{id}/consent` | Retrieves consent records by scope (`cognition`, `malaffi_fhir`). |
| `POST` | `/api/consent` | Updates user consent; triggers immediate audit log. |
| `POST` | `/api/sessions` | Initializes a new screening session (increments session count, selects form A–D). |
| `POST` | `/api/sessions/{id}/results` | Submits cognitive scores and context; **executes 5-Gate Orchestrator**. |
| `POST` | `/api/import/fhir` | Ingests simulated Malaffi / FHIR R4 wearable & clinical risk bundles. |
| `GET` | `/api/users/{id}/trend` | Returns longitudinal points + shaded $\pm 1.5$ SD baseline bands. |
| `GET` | `/api/users/{id}/risk` | Returns modifiable risk points, tier, and repeat interval. |
| `GET` | `/api/users/{id}/result` | Participant endpoint. **Enforces Gate 5 hold** if review is pending. |
| `GET` | `/api/review/queue` | Clinician console queue of held Orange/Red cases with CDS traces. |
| `POST` | `/api/review/{id}/decision` | Clinician decision (`approve`, `edit`, `escalate`); unlocks `/result`. |
| `GET` | `/api/admin/audit` | Returns latest 100 immutable audit log entries. |
| `GET` | `/api/admin/benchmark` | Returns synthetic cohort validation report (`sim/report.json`). |

---

## 10. Health Economics & Abu Dhabi IFHAS Pilot Plan

* **The IFHAS Preventive Pathway:** Built for integration into Abu Dhabi Public Health Centre (ADPHC) **IFHAS periodic screenings** across SEHA and M42 healthcare centers.
* **Avoided False-Positive Referrals:** **2,955 avoided specialist referrals per 10,000 screened adults** compared to static population norms.
* **Direct Cost Savings:** **AED 3,546,000 saved per 10k adults** based on avoided tertiary neurology consultations, brain MRI scans, and blood biomarker panels.
* **12-Month Phased Rollout:** Phase 1 (2 SEHA clinics in Abu Dhabi, N=1,000) $\to$ Phase 2 (Malaffi bidirectional link across 6 clinics, N=5,000) $\to$ Phase 3 (Full population scaling, N=10,000). Full roadmap detailed in [`docs/PILOT_PLAN.md`](docs/PILOT_PLAN.md).

---

## 11. Repository Map & Documentation Index

```text
brainbaseline-cdss/
├── pyproject.toml                  # Editable package definition (packages & sim)
├── docker-compose.yml              # One-command full-stack containerization
├── README.md                       # Master Product & Technical Manual
├── data/
│   ├── word_lists.json             # Forms A–D (Bilingual EN/AR concrete nouns)
│   ├── function_items.json         # 8 daily function items
│   └── triage_rules.json           # Pop priors, thresholds, banned diagnostic words
├── docs/
│   ├── TECHNICAL_ARCHITECTURE.md   # Mathematical equations, CUSUM, & 5-gate pipeline
│   ├── LIMITATIONS_AND_SAFETY.md   # Non-diagnostic boundaries, banned words, disclaimers
│   └── PILOT_PLAN.md               # Abu Dhabi primary-care & IFHAS routine screening plan
├── packages/
│   ├── engine/                     # Baseline, scoring, context, triage, and risk modules
│   └── explain/                    # Banned words filter, mandatory disclaimers, bilingual templates
├── sim/
│   ├── generate_cohort.py          # 2,000 synthetic cohort generator across 6 trajectories
│   ├── run_benchmark.py            # Simulation runner testing sensitivity & specificity
│   └── report.json                 # Generated benchmark artifact
├── tests/
│   ├── test_engine.py              # Statistical math unit tests
│   ├── test_gates.py               # 5-Gate safety, emergency bypass & banned words tests
│   └── test_api.py                 # FastAPI integration tests (Gate 5 hold, consent, etc.)
└── apps/
    ├── api/                        # FastAPI REST service & SQLModel SQLite WAL database
    └── web/                        # Next.js 14 bilingual App Router web application
```

---

<p align="center">
  <b>BrainBaseline CDSS</b> · Built with clinical rigor for the DoH Abu Dhabi × Inception 42 × Hack2Skill Healthcare AI Hackathon.
</p>
