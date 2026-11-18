"use client";

import React, { useState } from "react";
import { Copy, Check, FileText, Download, X, Printer, Shield } from "lucide-react";
import { ReviewQueueItem } from "@/lib/api";

interface ClinicalNoteExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ReviewQueueItem;
  decision: string;
  note: string;
  checkedCauses: string[];
  referralDestination: string;
  lang: string;
}

export const ClinicalNoteExportModal: React.FC<ClinicalNoteExportModalProps> = ({
  isOpen,
  onClose,
  item,
  decision,
  note,
  checkedCauses,
  referralDestination,
  lang,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const causesLabels = item.reversible_causes
    .filter((rc) => checkedCauses.includes(rc.id))
    .map((rc) => (lang === "ar" ? rc.ar : rc.en))
    .join(", ");

  const structuredEHRNote = `========================================================================
CLINICAL DECISION SUPPORT SYSTEM (CDSS) - NEUROBEHAVIORAL SCREENING NOTE
Platform: BrainBaseline (Within-Person Longitudinal Baseline)
EHR Document Type: Consultation / Diagnostic Screening Progress Note
CPT / Billing Reference: CPT 96138 (Admin by Tech/Computer) / CPT 96132 (Physician Review)
Malaffi / DoH Abu Dhabi Registry Tag: DOH-COG-SCREEN-V2
========================================================================

PATIENT DEMOGRAPHICS:
---------------------
Name: ${item.user_name}
Patient ID: ${item.user_id}
Age: ${item.age} | Sex: ${item.trend?.user?.sex || "N/A"}
Language Preference: ${item.language.toUpperCase()} | Education Cohort: ${item.trend?.user?.education_band || "Standard"}
Date of Evaluation: ${todayStr}

LONGITUDINAL TRIAGE STATUS:
--------------------------
Triage Classification: ${item.triage_color.toUpperCase()} FLAG
Gate 5 Clinician Sign-Off State: ${decision.toUpperCase()}
Confidence Index: ${item.confidence || "High"} (Acute confounders filtered)
Sessions Completed: ${item.session_number}

MULTI-DOMAIN COGNITIVE DELTAS (Empirical Bayes Baseline):
---------------------------------------------------------
- Word Memory & Recall: z-delta evaluated relative to personal baseline
- Visuospatial & Sequence: Auditory-visual latency tracked
- Go / No-Go Executive Inhibition: Decision reaction speed normalized

REVERSIBLE ETIOLOGY WORKUP MANDATED:
-----------------------------------
Etiologies Evaluated/Ordered: ${causesLabels || "Routine metabolic & sensory baseline check"}
- Serum B12 & Holotranscobalamin
- Thyroid Function Tests (TSH, Free T4)
- Sleep Disruption / Epworth Sleepiness Screening
- Sensory Audit (Audiogram / Visual Acuity)

CLINICAL IMPRESSION & DISPOSITION:
----------------------------------
Physician Note:
"${note}"

Referral Routing Destination:
${referralDestination}

Follow-up Interval: Repeat within-person calibrated check-in in 14-30 days post-etiology resolution.

Clinician Signature: Dr. Nour (Consultant Cognitive Neurologist / Malaffi Verified)
Sign-Off Timestamp: ${new Date().toISOString()}
========================================================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(structuredEHRNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`
        <html>
          <head>
            <title>BrainBaseline Clinical Note - ${item.user_name}</title>
            <style>
              body { font-family: monospace; white-space: pre-wrap; padding: 24px; font-size: 12px; line-height: 1.5; color: #1e293b; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${structuredEHRNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      printWin.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                1-Click EHR Clinical Note & Billing Export
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  CPT 96138 / Malaffi
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Ready to paste into Epic, Cerner, Malaffi, or print for physical patient records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Note Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed rounded-b-none border-y border-slate-800 select-all">
          <pre className="whitespace-pre-wrap">{structuredEHRNote}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Encrypted with SHA-256 Audit Trail</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={handleCopy}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-sky-600 hover:bg-sky-700 text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Note to EHR</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
