"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button } from "./ui";
import type { ComponentProps, ReactNode } from "react";

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

export function SubmitButton({ children, pendingLabel, ...props }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}

/** Generic progressive-enhancement form bound to a server action returning ActionState. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: (state: ActionState) => ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className} noValidate>
      {state.error && <Alert tone="error" className="mb-4">{state.error}</Alert>}
      {state.message && <Alert tone="success" className="mb-4">{state.message}</Alert>}
      {children(state)}
    </form>
  );
}
