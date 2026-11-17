# BrainBaseline: Limitations, Responsible AI & Safety Architecture

## 1. Regulatory Status & Non-Diagnostic Boundary

**BrainBaseline is an assistive Clinical Decision Support System (CDSS) and longitudinal cognitive monitoring platform. It is NOT a diagnostic device.**

* The platform does not diagnose Alzheimer's disease, vascular dementia, mild cognitive impairment (MCI), or any neurodegenerative condition.
* All reports, whether presented to the participant or clinician, are framed strictly as personal within-person deviations over time.
* Both English and Arabic interfaces enforce mandatory, non-negotiable regulatory disclaimers:
  > *"BrainBaseline is a cognitive tracking tool designed to detect personal changes over time. It is not a medical device and does not assess any specific medical condition. Please consult a qualified physician for clinical evaluation."*

---

## 2. Deterministic AI vs. Probabilistic LLM Separation

In high-stakes clinical neurology, generative language models (LLMs) can hallucinate diagnoses, provide inconsistent triage recommendations, or display sycophancy. BrainBaseline enforces a strict architectural boundary:

1. **LLM Never Triages:** Triage colors (`green`, `yellow`, `orange`, `red`, `baseline`) are determined exclusively by deterministic mathematical formulas (`packages/engine/triage.py`).
2. **Banned Diagnostic Words Guardrail:** All text generation passes through `packages/explain/guardrails.py`. Prohibited diagnostic terms are blocked:
   * English: `dementia`, `alzheimer`, `alzheimer's`, `mci`, `mild cognitive impairment`, `diagnosed`, `diagnosis`, `neurodegenerative`, `senile`.
   * Arabic: `خرف`, `زهايمر`, `تشخيص`, `مرض عقلي`.
3. **Template-Driven Explanations:** Explanations and participant guidance are derived from pre-validated deterministic templates (`packages/explain/templates.py`), ensuring calm, clear, and actionable feedback without panic induction.

---

## 3. Five Clinical Safety Gates

### Gate 1: Consent & Privacy Governance
* Active informed consent is verified for both cognitive sequence testing and external EHR/Malaffi integration.
* Participants can revoke consent at any moment via the UI or API (`POST /api/consent`), immediately halting screening and logging the event to an immutable audit ledger.

### Gate 2: 100% Red-Flag Emergency Bypass
* Evaluates acute neurological red flags (sudden confusion/delirium, sudden speech difficulty, unilateral limb weakness or facial droop, acute severe fall or head trauma).
* When triggered, all cognitive testing and statistical math are bypassed. The user is instructed immediately to call 999 or proceed to an emergency department. In our 2,000-patient synthetic validation, this gate achieved **100% detection accuracy (50/50 cases)**.

### Gate 3: Acute Context Filter
* Poor sleep, acute viral illness, high stress, or new sedative prescriptions can temporarily depress cognitive scores by 1.0–1.5 standard deviations.
* Gate 3 flags these confounded sessions and routes them to **Yellow (repeat in 10 days)** rather than triggering unnecessary specialty escalations.

### Gate 4: Safety Floors
* While BrainBaseline relies on within-person baselines, safety floors (`memory <= 7.0`, `sequence_av <= 5.0`, `attention_rt <= 25.0`) ensure that severe drops cannot be masked by prior high ability.

### Gate 5: Clinician Review Hold
* Participants classified as Orange or Red (non-emergency) are held in the Clinician Review Queue.
* The participant view displays a calm holding message (`"Your check is complete. A clinician is reviewing your longitudinal trend..."`) and **never exposes raw z-scores or alert labels** until a licensed healthcare provider verifies reversible causes and approves release.

---

## 4. Reversible Etiologies Workup

Before any participant is referred to tertiary memory clinics, the CDSS requires clinicians to consider and check reversible medical causes:
1. Low mood, acute grief, or untreated anxiety.
2. Sleep disruption or obstructive sleep apnea.
3. Anticholinergic, sedative, or new prescription medications.
4. Uncorrected hearing or vision impairment.
5. Vitamin B12 deficiency, thyroid dysfunction (TSH), or anemia.
6. Uncontrolled blood glucose, electrolytes, or dehydration.

---

## 5. Demographic & Cultural Fairness

Static Western cognitive screening norms inherently penalize individuals with low formal education or language differences. BrainBaseline's within-person shrinkage baseline evaluates each participant against their own past:
* In synthetic cohort benchmarking, the false-positive rate for **low-education participants dropped from 32.8% (under population norms) to 2.09% (under personal baselines)**.
* Negligible disparity between Arabic (`FPR 0.66%`) and English (`FPR 0.45%`) speakers.
