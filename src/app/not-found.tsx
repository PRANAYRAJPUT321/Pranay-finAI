import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="bg-ink relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center text-white">
      <div className="bg-grid-dark absolute inset-0 opacity-50" aria-hidden />
      <span className="floor-glow" aria-hidden />
      <span className="orb orb-violet float absolute -left-20 top-1/4 h-64 w-64 opacity-60" aria-hidden />
      <span className="orb orb-cyan float absolute bottom-16 right-[12%] h-24 w-24 opacity-80" style={{ animationDelay: "1.2s" }} aria-hidden />
      <span className="orb orb-pink float absolute right-[24%] top-24 h-10 w-10" style={{ animationDelay: "0.6s" }} aria-hidden />
      <div className="relative">
        <Link href="/" aria-label="PD FinPrep home" className="inline-block"><Logo inverted /></Link>
        <p className="headline-xl mt-10 text-[clamp(6rem,22vw,12rem)] leading-none text-gradient-brand" aria-hidden>404</p>
        <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">This page drifted out of orbit</h1>
        <p className="mx-auto mt-3 max-w-md text-navy-100">The link may be old or mistyped. Your progress is safe, so pick up where you left off.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-gold-500/40">Go to my dashboard</Link>
          <Link href="/" className="pill-outline">Home</Link>
        </div>
      </div>
    </main>
  );
}
