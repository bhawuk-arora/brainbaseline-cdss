"use client";

import React, { useState, useEffect } from "react";
import Link from "next/navigation";
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
} from "lucide-react";

export const AccessibilityBar: React.FC = () => {
  const {
    lang,
    setLang,
    dir,
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
    t,
  } = useApp();

  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api
      .getUsers()
      .then((res) => setUsers(res))
      .catch((e) => console.error("Failed to load users:", e));
  }, []);

  const handleRoleChange = (role: "participant" | "clinician" | "admin") => {
    setActiveRole(role);
    if (role === "participant") router.push("/");
    else if (role === "clinician") router.push("/clinician");
    else if (role === "admin") router.push("/admin");
  };

  const handlePersonaChange = (uId: string) => {
    setActiveUserId(uId);
    // Auto-sync language if user preference suggests it
    const targetUser = users.find((u) => u.id === uId);
    if (targetUser && (targetUser.language === "ar" || targetUser.language === "en")) {
      setLang(targetUser.language as any);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Upper Accessibility & Persona Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800/60">
        {/* Left: Persona Switcher */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            {t("accessibility.demo_personas")}
          </span>
          <select
            value={activeUserId}
            onChange={(e) => handlePersonaChange(e.target.value)}
            className="bg-sky-50 dark:bg-slate-800 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-slate-700 rounded-md px-2 py-1 font-medium text-xs focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
          >
            <option value="user_layla">Layla Al-Mansoori (Orange Held in Review)</option>
            <option value="user_tariq">Tariq Al-Nuaimi (Yellow Sleep Dip 3.5h)</option>
            <option value="user_fatima">Fatima Al-Ali (Green Stable Low-Edu)</option>
            <option value="user_omar">Omar Al-Husseini (Red Emergency Bypass)</option>
            <option value="user_sara">Sara Al-Zaabi (Building Baseline 2/4)</option>
          </select>
        </div>

        {/* Right: Accessibility Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-slate-700 dark:text-slate-200"
            title="Toggle English / Arabic"
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            {t("accessibility.language")}
          </button>

          {/* Font Scale Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5" title="Text Scaling">
            <Type className="w-3.5 h-3.5 mx-1 text-slate-500" />
            {([1, 1.5, 2] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => setFontScale(scale)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  fontScale === scale
                    ? "bg-white dark:bg-slate-700 text-sky-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {scale === 1 ? "100%" : scale === 1.5 ? "150%" : "200%"}
              </button>
            ))}
          </div>

          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium ${
              highContrast
                ? "bg-amber-400 text-black font-bold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
            title="High Contrast Mode"
          >
            <Eye className="w-3.5 h-3.5" />
            {t("accessibility.high_contrast")}
          </button>

          {/* Audio Prompt Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium ${
              audioEnabled
                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
            title="Spoken audio instructions (Web Speech)"
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            {t("accessibility.audio")}
          </button>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => router.push("/")}
            className="cursor-pointer flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              B
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                BrainBaseline
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold">
                  CDSS
                </span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                DoH Abu Dhabi × Inception 42 Cognitive Architecture
              </p>
            </div>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <button
            onClick={() => router.push("/")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              pathname === "/" ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t("nav.home")}
          </button>
          <button
            onClick={() => router.push("/check")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              pathname === "/check" ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t("nav.check")}
          </button>
          <button
            onClick={() => router.push("/result")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              pathname === "/result" ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t("nav.result")}
          </button>
        </nav>

        {/* Right: Role Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => handleRoleChange("participant")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeRole === "participant"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("roles.participant")}</span>
          </button>

          <button
            onClick={() => handleRoleChange("clinician")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeRole === "clinician"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("roles.clinician")}</span>
          </button>

          <button
            onClick={() => handleRoleChange("admin")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeRole === "admin"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("roles.admin")}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
