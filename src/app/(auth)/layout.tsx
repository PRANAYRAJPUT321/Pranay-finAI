import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <header className="px-4 py-5 sm:px-8">
        <Link href="/" aria-label="PD FinPrep home">
          <Logo inverted />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">{children}</div>
      </main>
    </div>
  );
}
