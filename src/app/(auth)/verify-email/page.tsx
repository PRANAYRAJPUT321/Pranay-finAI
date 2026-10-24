import { Alert, LinkButton } from "@/components/ui";
import { verifyEmail } from "@/server/auth/service";

export const metadata = { title: "Verify email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmail(token) : false;
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-navy-900">Email verification</h1>
      {ok ? <Alert tone="success">Your email address is verified.</Alert> : <Alert tone="error">This verification link is invalid or has expired. You can request a new one from Settings.</Alert>}
      <LinkButton href="/dashboard" className="mt-5 w-full">Go to dashboard</LinkButton>
    </>
  );
}
