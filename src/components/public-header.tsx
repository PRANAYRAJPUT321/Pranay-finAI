import Link from "next/link";
import { Logo } from "./logo";
import { getCurrentUser } from "@/server/auth/current";

export async function PublicHeader() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="PD FinPrep home"><Logo inverted /></Link>
        <nav aria-label="Site" className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/catalog" className="rounded px-2 py-1 text-navy-100 transition hover:text-gold-300">Exams</Link>
          {user ? (
            <Link href="/dashboard" className="btn-shine bg-gradient-gold rounded-lg px-3 py-1.5 font-semibold text-navy-950 shadow-md shadow-gold-500/30 transition hover:-translate-y-0.5">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="rounded px-2 py-1 text-navy-100 transition hover:text-gold-300">Sign in</Link>
              <Link href="/register" className="btn-shine bg-gradient-gold rounded-lg px-3 py-1.5 font-semibold text-navy-950 shadow-md shadow-gold-500/30 transition hover:-translate-y-0.5">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} PD FinPrep. Unofficial preparation platform — not affiliated with or endorsed by any examination body. Trademarks belong to their owners.</p>
        <nav className="flex gap-4"><Link href="/privacy" className="hover:underline">Privacy</Link><Link href="/catalog" className="hover:underline">Exam catalog</Link></nav>
      </div>
    </footer>
  );
}
