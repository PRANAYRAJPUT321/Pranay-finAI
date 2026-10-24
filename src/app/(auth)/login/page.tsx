import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/current";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold text-navy-900">Sign in</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">Continue your preparation where you left off.</p>
      {sp.reset && <Alert tone="success" className="mb-4">Password updated. Sign in with your new password.</Alert>}
      <LoginForm next={sp.next} />
      <p className="mt-6 text-center text-sm text-slate-600">
        New to PD FinPrep? <Link href="/register" className="font-medium text-navy-800 underline">Create an account</Link>
      </p>
    </>
  );
}
