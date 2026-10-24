import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold text-navy-900">Choose a new password</h1>
      {!token ? (
        <Alert tone="error" className="mt-4">
          This link is incomplete. <Link href="/forgot-password" className="underline">Request a new reset link</Link>.
        </Alert>
      ) : (
        <div className="mt-5"><ResetPasswordForm token={token} /></div>
      )}
    </>
  );
}
