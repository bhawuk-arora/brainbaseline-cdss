import type { Metadata } from "next";
import { AppProvider } from "@/lib/context";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrainBaseline CDSS | Longitudinal Cognitive Health Platform",
  description:
    "Within-person longitudinal baseline cognitive screening with 5-Gate agentic clinical decision support, reversible-cause verification, and demographic fairness.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-sky-500 selection:text-white">
        <AppProvider>
          <AccessibilityBar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 text-center text-xs text-slate-500">
            <p>
              BrainBaseline Clinical Decision Support System · DoH Abu Dhabi × Inception 42 Cognitive Health AI Initiative
            </p>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
