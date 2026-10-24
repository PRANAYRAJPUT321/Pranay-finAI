import Link from "next/link";
import { Logo } from "./logo";
import { getCurrentUser } from "@/server/auth/current";

export async function PublicHeader() {
  const user = await getCurrentUser();
  return (
    <header className="bg-navy-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="PD FinPrep home"><Logo inverted /></Link>
        <nav aria-label="Site" className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/catalog" className="rounded px-2 py-1 text-navy-100 hover:text-white">Exams</Link>
          {user ? (
            <Link href="/dashboard" className="rounded-lg bg-gold-500 px-3 py-1.5 font-medium text-navy-950 hover:bg-gold-400">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="rounded px-2 py-1 text-navy-100 hover:text-white">Sign in</Link>
              <Link href="/register" className="rounded-lg bg-gold-500 px-3 py-1.5 font-medium text-navy-950 hover:bg-gold-400">Get started</Link>
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
