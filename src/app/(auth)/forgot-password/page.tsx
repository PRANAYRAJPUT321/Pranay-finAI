import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-navy-900">Reset your password</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">We will email you a link to choose a new password.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-navy-800 underline">Back to sign in</Link></p>
    </>
  );
}
