import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";

const POINTS = ["Personalised day-by-day study plan", "Original exam-style questions with full explanations", "Timed mocks, spaced revision and honest analytics"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-navy relative flex min-h-screen flex-col overflow-hidden">
      <div className="aurora" aria-hidden />
      <div className="bg-grid-dark absolute inset-0" aria-hidden />
      <header className="relative px-4 py-5 sm:px-8">
        <Link href="/" aria-label="PD FinPrep home"><Logo inverted /></Link>
      </header>
      <main id="main" className="relative mx-auto grid w-full max-w-5xl flex-1 items-start gap-10 px-4 pb-16 pt-4 sm:pt-10 lg:grid-cols-2 lg:items-center">
        <div className="hidden text-white lg:block">
          <h2 className="animate-fade-up text-4xl font-bold leading-tight">Prepare with a plan that <span className="text-gradient-gold">adapts to you.</span></h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p, i) => (
              <li key={p} className="animate-fade-up flex items-center gap-3 text-navy-100" style={{ "--delay": `${120 + i * 90}ms` } as React.CSSProperties}>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold-400" aria-hidden /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card animate-fade-up w-full max-w-md justify-self-center p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
