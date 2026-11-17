"use client";

import React, { useState } from "react";
import { GateStep } from "@/lib/api";
import { Shield, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Cpu, Binary, FileText } from "lucide-react";

interface AgentTracePanelProps {
  trace: GateStep[];
  title?: string;
}

export const AgentTracePanel: React.FC<AgentTracePanelProps> = ({
  trace,
  title = "5-Gate Agentic Execution Trace (Deterministic Safety Pipeline)",
}) => {
  const [expandedGates, setExpandedGates] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: true, // Default Gate 4 expanded
    5: true, // Default Gate 5 expanded
  });

  const toggleGate = (num: number) => {
    setExpandedGates((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASSED":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> PASSED
          </span>
        );
      case "BYPASS_EMERGENCY":
        return (
          <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> 100% EMERGENCY BYPASS
          </span>
        );
      case "HOLD_PENDING_CLINICIAN":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3 text-amber-600" /> CLINICIAN HOLD ACTIVE
          </span>
        );
      case "RELEASED_DIRECT":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <CheckCircle className="w-3 h-3 text-blue-600" /> RELEASED DIRECT
          </span>
        );
      case "FLAGGED":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
            <AlertTriangle className="w-3 h-3 text-orange-600" /> DEVIATION FLAGGED
          </span>
        );
      case "AFFECTED":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
            <AlertTriangle className="w-3 h-3 text-yellow-600" /> CONTEXT AFFECTED
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "RECORDED_OBSERVATION":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <FileText className="w-3 h-3" /> RECORDED OBSERVATION
          </span>
        );
      case "CALCULATED_MATH":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            <Binary className="w-3 h-3" /> CALCULATED MATH
          </span>
        );
      case "TEMPLATE_EXPLANATION":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Cpu className="w-3 h-3" /> TEMPLATE EXPLANATION
          </span>
        );
      default:
        return null;
    }
  };

  if (!trace || trace.length === 0) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-sky-600" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Strict separation of clinical inputs: LLM never decides triage color. Guardrails enforce deterministic mathematical formulas and clinician sign-off gates.
      </p>

      <div className="space-y-2.5">
        {trace.map((step) => {
          const isExpanded = expandedGates[step.gate_number] ?? false;
          return (
            <div
              key={step.gate_number}
              className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-2xs"
            >
              <div
                onClick={() => toggleGate(step.gate_number)}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-black text-xs flex items-center justify-center">
                    G{step.gate_number}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {step.gate_name}
                  </span>
                  {getCategoryBadge(step.category)}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(step.status)}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
                  <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 text-[11px] overflow-x-auto font-mono">
                    {JSON.stringify(step.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
