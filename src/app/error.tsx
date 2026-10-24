"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="relative grid min-h-[70vh] place-items-center overflow-hidden px-4">
      <div className="aurora" aria-hidden />
      <div className="glass-card relative max-w-lg p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-600">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold text-navy-900">We couldn&apos;t load this page</h1>
        <p className="mt-3 text-sm text-slate-600">
          This is usually temporary. Please try again. If you run this site and every page shows this message, check that the database is connected —
          the <code className="rounded bg-slate-100 px-1">/api/health</code> endpoint reports its status.
        </p>
        {error.digest && <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn-shine rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">Try again</button>
          <Link href="/" className="rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">Home</Link>
        </div>
      </div>
    </main>
  );
}
