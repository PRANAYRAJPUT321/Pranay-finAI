"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction, type FormState } from "@/app/actions/auth";
import { Alert, Field, Input } from "./ui";
import { SubmitButton } from "./forms";

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Alert tone="error" className="mb-4">{state.error}</Alert>}
      {state.message && <Alert tone="success" className="mb-4">{state.message}</Alert>}
    </>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-navy-700 underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <Field id="name" label="Name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Password" error={state.fieldErrors?.password} hint="At least 10 characters, including a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="consent" className="mt-1" />
          <span>
            I understand PD FinPrep stores my account details and learning activity to personalise my preparation, as described in the{" "}
            <Link href="/privacy" className="text-navy-700 underline">privacy notice</Link>.
          </span>
        </label>
        {state.fieldErrors?.consent && <p className="mt-1 text-xs text-red-700" role="alert">{state.fieldErrors.consent}</p>}
      </div>
      <SubmitButton className="w-full" pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="New password" error={state.fieldErrors?.password} hint="At least 10 characters, including a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirm" label="Confirm new password" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving…">Set new password</SubmitButton>
    </form>
  );
}
