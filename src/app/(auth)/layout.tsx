import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";

const POINTS = ["Personalised day-by-day study plan", "Original exam-style questions with full explanations", "Timed mocks, spaced revision and honest analytics"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-ink relative flex min-h-screen flex-col overflow-hidden">
      <span className="red-beam left-[38%]" aria-hidden />
      <span className="floor-glow" aria-hidden />
      <div className="bg-grid-dark absolute inset-0 opacity-50" aria-hidden />
      <header className="relative px-4 py-5 sm:px-8">
        <Link href="/" aria-label="PD FinPrep home"><Logo inverted /></Link>
      </header>
      <main id="main" className="relative mx-auto grid w-full max-w-5xl flex-1 items-start gap-10 px-4 pb-16 pt-4 sm:pt-10 lg:grid-cols-2 lg:items-center">
        <div className="hidden text-white lg:block">
          <p className="eyebrow animate-fade-up text-mint-300">Same exams / New perspectives</p>
          <h2 className="headline-xl animate-fade-up mt-5 uppercase"><span className="block text-7xl text-gold-500">Prepared</span><span className="block text-5xl text-white">Differently</span></h2>
          <span className="rule-red mt-6" aria-hidden />
          <ul className="mt-6 space-y-4">
            {POINTS.map((p, i) => (
              <li key={p} className="animate-fade-up flex items-center gap-3 text-navy-100" style={{ "--delay": `${120 + i * 90}ms` } as React.CSSProperties}>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-300" aria-hidden /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card animate-fade-up w-full max-w-md justify-self-center p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
