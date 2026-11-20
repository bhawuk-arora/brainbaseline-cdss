"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/lib/context";
import { api, UserSummary } from "@/lib/api";
import {
  Globe,
  Type,
  Eye,
  Volume2,
  VolumeX,
  UserCheck,
  Stethoscope,
  BarChart3,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";

export const AccessibilityBar: React.FC = () => {
  const {
    lang,
    setLang,
    fontScale,
    setFontScale,
    highContrast,
    setHighContrast,
    audioEnabled,
    setAudioEnabled,
    activeUserId,
    setActiveUserId,
    activeRole,
    setActiveRole,
    isAuthenticated,
    userEmail,
    logout,
    t,
  } = useApp();

  const router = useRouter();
  const pathname = usePathname();
  const [showDevDrawer, setShowDevDrawer] = useState(false);

  const handleRoleSwitch = (role: "participant" | "clinician" | "director" | "admin") => {
    setActiveRole(role);
    if (role === "participant") router.push("/result");
    else if (role === "clinician") router.push("/clinician");
    else if (role === "director") router.push("/director");
    else if (role === "admin") router.push("/admin");
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Clean, Professional Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-base shadow-xs">
              B
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block leading-tight">
                BrainBaseline
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {activeRole === "participant" && "Patient Vitality Portal"}
                {activeRole === "clinician" && "Clinical Decision Workstation"}
                {activeRole === "director" && "Hospital Medical Director"}
                {activeRole === "admin" && "Health Authority & Governance"}
              </span>
            </div>
          </button>

          {/* Contextual Nav based on Role */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {activeRole === "participant" && (
              <>
                <button
                  onClick={() => router.push("/result")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/result" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900"
                  }`}
                >
                  My Health Dashboard
                </button>
                <button
                  onClick={() => router.push("/check")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/check" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Start Check-In
                </button>
              </>
            )}

            {activeRole === "clinician" && (
              <>
                <button
                  onClick={() => router.push("/clinician")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/clinician" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Patient Review Queue
                </button>
                <button
                  onClick={() => router.push("/onboard")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/onboard" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900 text-teal-700 dark:text-teal-400"
                  }`}
                >
                  + Onboard Patient
                </button>
              </>
            )}

            {activeRole === "director" && (
              <>
                <button
                  onClick={() => router.push("/director")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/director" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Hospital Director Operations
                </button>
                <button
                  onClick={() => router.push("/clinician")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/clinician" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Doctor Console
                </button>
              </>
            )}

            {activeRole === "admin" && (
              <>
                <button
                  onClick={() => router.push("/admin")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/admin" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Root Population Benchmarks
                </button>
                <button
                  onClick={() => router.push("/director")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathname === "/director" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Director Console
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right: Essential Patient Accessibility & Portal Switcher */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span>{lang === "en" ? "العربية" : "English"}</span>
          </button>

          {/* Text Size (Essential for Seniors) */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {([1, 1.5, 2] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => setFontScale(scale)}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  fontScale === scale
                    ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {scale === 1 ? "A" : scale === 1.5 ? "A+" : "A++"}
              </button>
            ))}
          </div>

          {/* Switch Portal or Logout */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
              <span className="hidden lg:inline text-[11px] text-slate-500 font-medium max-w-[120px] truncate" title={userEmail || activeUserId}>
                {userEmail || activeUserId.replace("user_", "")}
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/auth");
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-medium transition flex items-center gap-1"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/auth")}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold transition"
            >
              Sign In
            </button>
          )}

          {/* Testing Switcher removed for pure production integrity */}
        </div>
      </div>
    </header>
  );
};
