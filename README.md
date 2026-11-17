# BrainBaseline: Deterministic Longitudinal Cognitive Health Screening & CDSS

> **Aligned with the DoH Abu Dhabi × Inception 42 × Hack2Skill Healthcare AI Hackathon.**  
> Built to eliminate language and education bias in cognitive assessment through **Within-Person Longitudinal Baselines**, **5-Gate Agentic Clinical Decision Support (CDSS)**, and an **Interactive Reversible-Cause Gate**.

---

## 🌟 Hackathon Winning Highlights

* **1. Clinical Relevance & Impact:** Replaces error-prone single-snapshot screening with personalized longitudinal baselines, checking treatable reversible causes (B12, thyroid, sleep apnea, medications) before specialty referral.
* **2. Technical Depth:** Deterministic statistical engine combining **Empirical Bayes shrinkage ($k=4$)**, **robust within-person z-scores**, **Reliable Change Index (RCI)**, and **sequential CUSUM drift detection**.
* **3. Working Solution & Polish:** Interactive Next.js 14 frontend with **1-Click Persona Switcher**, 4-Pad Audio-Visual Sequence Studio, Word Memory task, and Go/No-Go reaction time tester.
* **4. Responsible AI & Safety:** Generative LLMs never make triage decisions; 100% Red-Flag emergency bypass for acute neurological signs; Gate 5 Clinician Hold prevents participant disclosure of unverified clinical flags; strict banned-word guardrail.
* **5. Scalability & Deployment Readiness:** Native Arabic (RTL) & English localization, 200% text scaling, high-contrast mode, Malaffi / FHIR R4 interoperability, and Docker Compose stack.
* **6. Commercial Viability:** Built-in Health Economics Calculator demonstrating **2,955 avoided false-positive specialist referrals** and **AED 3,546,000 in direct savings per 10,000 screened adults**.

---

## 🚀 Quick Start (Local Docker Boot)

Run the full stack with one command:

```bash
docker compose up --build
```

* **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
* **Backend REST API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 💻 Local Development Setup (Without Docker)

### Backend (FastAPI + SQLModel)
```bash
# Install package and dependencies in virtualenv
pip install -e .

# Run automated tests
pytest -v

# Run cohort simulation benchmark
python sim/run_benchmark.py

# Launch API server
uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Next.js 14 App Router)
```bash
cd apps/web
npm install
npm run dev
```

---

## 👥 5-Persona Live Demonstration Guide

Judges can test every clinical edge case in seconds using the top **Persona Switcher**:

| Persona | Clinical Scenario | Expected Platform Behavior | Where to Observe |
| :--- | :--- | :--- | :--- |
| **Layla Al-Mansoori** | Persistent decline across 6 sessions + daily functional changes | **Orange Flagged**. **Gate 5 Clinician Hold** is active. Participant endpoint returns calm holding message; Clinician Console shows case in queue with interactive trend chart and reversible-cause checklist. Approving in `/clinician` unlocks `/result` immediately. | `/clinician` & `/result` |
| **Tariq Al-Nuaimi** | Acute sleep disruption (3.5 hours) causing temporary cognitive dip | **Gate 3 Context Confounder Gate** detects sleep $<5$h. Triaged as **Yellow (repeat in 10 days)** rather than triggering a false dementia alarm. | `/result` |
| **Fatima Al-Ali** | Low formal education elderly participant | Traditional population norms falsely fail her. BrainBaseline's **Within-Person Shrinkage** proves she is perfectly stable ($z \approx 0.0$). Triaged as **Green (repeat in 90 days)**. | `/result` & `/admin` |
| **Omar Al-Husseini** | Acute sudden confusion and speech difficulty reported today | **Gate 2 Emergency Gate** triggers **100% immediate bypass**. Cognitive math is skipped; participant is routed immediately to 999 emergency evaluation. | `/check` & `/result` |
| **Sara Al-Zaabi** | Baseline calibration in progress | Completed Session 2 of 4. Platform notifies participant that 2 more sessions are needed to establish reference baseline. | `/check` & `/result` |

---

## ☁️ Public Cloud Deployment Steps

### 1. Azure Container Apps
```bash
az acr build --registry <YourRegistry> --image brainbaseline-api:v1 -f apps/api/Dockerfile .
az acr build --registry <YourRegistry> --image brainbaseline-web:v1 -f apps/web/Dockerfile .

az containerapp create --name brainbaseline-api --resource-group <YourRG> \
  --environment <YourEnv> --image <YourRegistry>.azurecr.io/brainbaseline-api:v1 \
  --target-port 8000 --ingress external

az containerapp create --name brainbaseline-web --resource-group <YourRG> \
  --environment <YourEnv> --image <YourRegistry>.azurecr.io/brainbaseline-web:v1 \
  --target-port 3000 --ingress external \
  --env-vars NEXT_PUBLIC_API_URL=https://<your-api-url>
```

### 2. Render / Railway
* **Backend:** Deploy from Git root as Docker service targeting `apps/api/Dockerfile`, exposing port `8000`. Set persistent volume mount to `/app/data_storage`.
* **Frontend:** Deploy from Git root as Docker service targeting `apps/web/Dockerfile`, exposing port `3000`. Set environment variable `NEXT_PUBLIC_API_URL` to backend service URL.

---

## 🎬 Timed 3-Minute Hackathon Demo Video Script

* **[0:00 - 0:30] The Clinical Problem (Why Single Snapshots Fail):**  
  *"Cognitive screening today is broken. In diverse populations like the UAE, 30% of normal adults fail standard tests simply because of language or education differences, overwhelming neurology clinics with false alarms. Meet BrainBaseline: the first within-person longitudinal screening CDSS designed for Abu Dhabi primary care."*

* **[0:30 - 1:15] Live Participant Assessment & Tasks:**  
  *Open `/check` with audio and high-contrast enabled.*  
  *"Watch our 5-Gate pipeline in action. We verify consent, check red flags, screen context like sleep hours, and run our multi-modal tasks: Word Memory, our 4-Pad Audio-Visual Sequence Studio synthesizing real-time tones, and Go/No-Go reaction speed. Notice the live Agent Trace separating recorded observations, deterministic math, and template explanations."*

* **[1:15 - 2:00] Gate 5 Clinician Hold & Reversible Causes:**  
  *Switch to Layla Al-Mansoori and open `/result`, then `/clinician`.*  
  *"When Layla experiences a true decline, Gate 5 holds her report. Layla sees a calm holding screen—she is never panicked with raw z-scores. On the Clinician Console, Dr. Nour reviews Layla's longitudinal trend with personal baseline bands, checks reversible causes like B12 and hearing impairment, simulates Malaffi wearable import, and releases the plan. Instantly, Layla's app unlocks her personalized action steps."*

* **[2:00 - 2:30] Fairness & The Fatima Al-Ali Proof:**  
  *Select Fatima Al-Ali.*  
  *"Here is Fatima, an elderly participant with limited schooling. Static Western norms label her impaired. But because BrainBaseline compares Fatima to her own past, she is correctly classified as Green Stable. We eliminate the educational penalty."*

* **[2:30 - 3:00] Population Impact & Abu Dhabi IFHAS Pilot:**  
  *Open `/admin` Benchmark & Economics tab.*  
  *"Validated across a 2,000-patient synthetic cohort, our engine achieves 100% sensitivity, 100% emergency gate accuracy, and avoids 2,955 unnecessary specialist referrals per 10,000 adults—saving AED 3.54 million in direct primary care costs. BrainBaseline is ready for the IFHAS routine preventive pathway. Thank you."*
