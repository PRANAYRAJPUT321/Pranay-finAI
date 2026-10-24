import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/server/auth/current";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <>
      <h1 className="text-xl font-semibold text-navy-900">Create your account</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">Free to start. No payment details required.</p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered? <Link href="/login" className="font-medium text-navy-800 underline">Sign in</Link>
      </p>
    </>
  );
}
