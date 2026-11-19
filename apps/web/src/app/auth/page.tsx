"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import {
  ShieldCheck,
  Stethoscope,
  Building2,
  Lock,
  ArrowRight,
  CheckCircle2,
  Mail,
  AlertCircle,
  KeyRound,
  Hospital,
  ChevronRight,
  UserCheck,
  User,
  Shield,
  Sparkles,
} from "lucide-react";

export default function AuthPage() {
  const { lang, setActiveRole, setActiveUserId, loginUser } = useApp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Please enter your account password.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await api.login({ email, password });
      setIsLoading(false);
      loginUser(res.user_id, res.role as any, res.email);

      // Route immediately according to the user's authenticated role
      if (res.role === "clinician") {
        router.push("/clinician");
      } else if (res.role === "director") {
        router.push("/director");
      } else if (res.role === "admin") {
        router.push("/admin");
      } else if (res.role === "receptionist") {
        router.push("/reception");
      } else {
        router.push("/result");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setIsLoading(false);
      setErrorMsg(
        err.message?.includes("403") || err.message?.includes("Access Denied")
          ? err.message.replace("API Error 403: ", "")
          : err.message?.includes("401")
          ? "Invalid email or password. Please verify your credentials."
          : err.message || "Failed to authenticate."
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Clean, Professional Hospital Portal Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 sm:p-9 shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 mx-auto shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-teal-400 dark:text-teal-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Clinical Portal Sign In
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Department of Health Abu Dhabi • Cognitive Health CDSS
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Work or Personal Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@doh.gov.ae or doctor@hospital.ae"
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs transition flex items-center justify-center gap-2 shadow-2xs mt-2"
            >
              <span>{isLoading ? "Signing in..." : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Clean minimal footer footnote */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Access credentials automatically route to your authorized tier (Clinician, Medical Director, Reception, Admin, or Patient).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
