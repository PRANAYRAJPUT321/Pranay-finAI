import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./logo";
import { getCurrentUser } from "@/server/auth/current";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Exams" },
  { href: "/exam-guide", label: "Dates & Fees" },
];

export async function PublicHeader() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="PD FinPrep home"><Logo inverted /></Link>
        <nav aria-label="Site" className="flex items-center gap-2 sm:gap-7">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-navy-100 transition hover:text-white md:inline">
              {l.label}
            </Link>
          ))}
          {user ? (
            <Link href="/dashboard" className="pill-outline !py-2">Dashboard <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
          ) : (
            <>
              <Link href="/login" className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-navy-100 transition hover:text-white">Sign in</Link>
              <Link href="/register" className="pill-outline !py-2">Start <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-ink relative overflow-hidden text-navy-100">
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo inverted />
          <span className="rule-red mt-4" aria-hidden />
          <p className="mt-4 max-w-md text-xs leading-relaxed text-navy-200">
            Unofficial preparation platform — not affiliated with or endorsed by any examination body. Trademarks belong to their owners. We never promise a pass.
          </p>
        </div>
        <nav aria-label="Explore" className="space-y-2 text-sm">
          <p className="eyebrow text-[0.6rem] text-mint-300">Explore</p>
          <Link href="/catalog" className="block hover:text-white">Exam catalog</Link>
          <Link href="/exam-guide" className="block hover:text-white">Dates, fees & difficulty</Link>
          <Link href="/register" className="block hover:text-white">Create an account</Link>
        </nav>
        <nav aria-label="Legal" className="space-y-2 text-sm">
          <p className="eyebrow text-[0.6rem] text-mint-300">About</p>
          <Link href="/privacy" className="block hover:text-white">Privacy</Link>
          <Link href="/login" className="block hover:text-white">Sign in</Link>
        </nav>
      </div>
      <p className="relative border-t border-white/10 py-4 text-center text-[11px] tracking-widest text-navy-300">© {new Date().getFullYear()} PD FINPREP</p>
    </footer>
  );
}
