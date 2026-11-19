"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import enTranslations from "@/i18n/en.json";
import arTranslations from "@/i18n/ar.json";

export type Language = "en" | "ar";
export type TextScale = 1 | 1.5 | 2;
export type Role = "participant" | "clinician" | "director" | "admin" | "receptionist";

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  dir: "ltr" | "rtl";
  fontScale: TextScale;
  setFontScale: (scale: TextScale) => void;
  highContrast: boolean;
  setHighContrast: (hc: boolean) => void;
  audioEnabled: boolean;
  setAudioEnabled: (a: boolean) => void;
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  activeRole: Role;
  setActiveRole: (r: Role) => void;
  isAuthenticated: boolean;
  userEmail: string | null;
  loginUser: (userId: string, role: Role, email?: string) => void;
  logout: () => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>("en");
  const [fontScale, setFontScaleState] = useState<TextScale>(1);
  const [highContrast, setHighContrastState] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(false);
  const [activeUserId, setActiveUserIdState] = useState<string>("user_sara");
  const [activeRole, setActiveRoleState] = useState<Role>("participant");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const dir = lang === "ar" ? "rtl" : "ltr";

  // Sync dir and language to html tag with SSR safe check
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
      if (highContrast) {
        document.documentElement.classList.add("high-contrast");
      } else {
        document.documentElement.classList.remove("high-contrast");
      }
    }
  }, [lang, dir, highContrast]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("bb_lang", newLang);
    }
  };

  const setFontScale = (scale: TextScale) => {
    setFontScaleState(scale);
    if (typeof window !== "undefined") {
      localStorage.setItem("bb_font_scale", String(scale));
    }
  };

  const setHighContrast = (hc: boolean) => {
    setHighContrastState(hc);
    if (typeof window !== "undefined") {
      localStorage.setItem("bb_high_contrast", String(hc));
    }
  };

  const setAudioEnabled = (a: boolean) => {
    setAudioEnabledState(a);
    if (typeof window !== "undefined") {
      localStorage.setItem("bb_audio", String(a));
    }
  };

  const setActiveUserId = (id: string) => {
    setActiveUserIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("bb_user_id", id);
    }
  };

  const setActiveRole = (r: Role) => {
    setActiveRoleState(r);
    if (typeof window !== "undefined") {
      localStorage.setItem("bb_role", r);
    }
  };

  const loginUser = (userId: string, role: Role, email?: string) => {
    setActiveUserIdState(userId);
    setActiveRoleState(role);
    setIsAuthenticated(true);
    if (email) setUserEmail(email);
    if (typeof window !== "undefined") {
      localStorage.setItem("bb_user_id", userId);
      localStorage.setItem("bb_role", role);
      localStorage.setItem("bb_auth", "true");
      if (email) localStorage.setItem("bb_email", email);
    }
  };

  const logout = () => {
    setActiveUserIdState("user_sara");
    setActiveRoleState("participant");
    setIsAuthenticated(false);
    setUserEmail(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("bb_user_id");
      localStorage.removeItem("bb_role");
      localStorage.removeItem("bb_auth");
      localStorage.removeItem("bb_email");
    }
  };

  // Restore saved accessibility preferences and auth session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("bb_lang") as Language;
      if (savedLang && (savedLang === "en" || savedLang === "ar")) setLangState(savedLang);

      const savedScale = Number(localStorage.getItem("bb_font_scale")) as TextScale;
      if (savedScale && [1, 1.5, 2].includes(savedScale)) setFontScaleState(savedScale);

      const savedHc = localStorage.getItem("bb_high_contrast") === "true";
      setHighContrastState(savedHc);

      const savedAudio = localStorage.getItem("bb_audio") === "true";
      setAudioEnabledState(savedAudio);

      // Session persistence
      const savedAuth = localStorage.getItem("bb_auth") === "true";
      const savedUserId = localStorage.getItem("bb_user_id");
      const savedRole = localStorage.getItem("bb_role") as Role;
      const savedEmail = localStorage.getItem("bb_email");

      if (savedAuth && savedUserId) {
        setIsAuthenticated(true);
        setActiveUserIdState(savedUserId);
        if (savedRole) setActiveRoleState(savedRole);
        if (savedEmail) setUserEmail(savedEmail);
      }
    }
  }, []);

  // Translation lookup helper (supports nested keys like "home.hero_title")
  const t = (path: string): string => {
    const dict: any = lang === "ar" ? arTranslations : enTranslations;
    const parts = path.split(".");
    let current: any = dict;
    for (const p of parts) {
      if (current && typeof current === "object" && p in current) {
        current = current[p];
      } else {
        return path;
      }
    }
    return typeof current === "string" ? current : path;
  };

  return (
    <AppContext.Provider
      value={{
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
        isAuthenticated,
        userEmail,
        loginUser,
        logout,
        t,
      }}
    >
      <div
        style={{
          fontSize: `${fontScale * 100}%`,
          lineHeight: 1.5,
        }}
        className="min-h-screen flex flex-col font-sans transition-all duration-150"
      >
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
