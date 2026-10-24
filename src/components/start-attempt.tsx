"use client";

import { useActionState } from "react";
import { startAttemptAction } from "@/app/actions/learning";
import { SubmitButton } from "./forms";
import type { ComponentProps } from "react";
import type { Button } from "./ui";

/** One-click start for a pre-configured assessment (hidden fields). */
export function StartAttemptButton({
  fields,
  children,
  variant = "primary",
  size = "sm",
  className,
}: {
  fields: Record<string, string | number | string[] | undefined | null>;
  children: React.ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [state, action] = useActionState(startAttemptAction, {});
  return (
    <form action={action} className={className}>
      {Object.entries(fields).flatMap(([k, v]) =>
        v === undefined || v === null ? [] : Array.isArray(v) ? v.map((x) => <input key={`${k}-${x}`} type="hidden" name={k} value={x} />) : [<input key={k} type="hidden" name={k} value={String(v)} />],
      )}
      <SubmitButton variant={variant} size={size} pendingLabel="Preparing…">{children}</SubmitButton>
      {state.error && <p role="alert" className="mt-1 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
