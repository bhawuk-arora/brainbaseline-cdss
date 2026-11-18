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
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Narrative */}
        <div className="lg:col-span-5 space-y-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Authorized Clinical Security</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Hospital Portal Sign In
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Enter your authorized email and password. Your access role is verified automatically based on your credential tier.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              {
                title: "1. Patients & Participants",
                desc: "Check personal cognitive vitality trajectory and non-diagnostic summaries.",
              },
              {
                title: "2. Licensed Clinicians",
                desc: "Review flagged cases, confirm reversible causes (sleep, B12), and sign off Gate 5 holds.",
              },
              {
                title: "3. Hospital Medical Director",
                desc: "Oversee attending physicians, review SLAs, and execute Gate 5 clinical overrides.",
              },
              {
                title: "4. Health Authority / Root Admin",
                desc: "2,000 synthetic cohort benchmarks, subgroup demographic fairness, and economic savings.",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.title}: </span>
                  <span className="text-slate-600 dark:text-slate-400 font-normal">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Authentication Form */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Account Sign In
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Role will be automatically resolved by your registered institution domain.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Institutional or Personal Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@doh.gov.ae or user@example.com"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
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
                    placeholder="Enter your account password"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white dark:bg-white dark:text-slate-900 font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>{isLoading ? "Authenticating..." : "Sign In to Platform"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
