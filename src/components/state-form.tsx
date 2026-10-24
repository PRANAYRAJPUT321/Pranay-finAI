"use client";

import { useActionState } from "react";
import { Alert } from "./ui";
import type { ActionState } from "./forms";

/** Client wrapper so server components can render forms bound to state-returning server actions. */
export function StateForm({ action, children, className }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; children: React.ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error && <Alert tone="error" className="mb-3">{state.error}</Alert>}
      {state.message && <Alert tone="success" className="mb-3">{state.message}</Alert>}
      {children}
    </form>
  );
}
