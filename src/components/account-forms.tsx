"use client";

import { useActionState } from "react";
import { changePasswordAction, createGroupAction, deleteAccountAction, joinGroupAction, updateProfileAction } from "@/app/actions/account";
import { resendVerificationAction } from "@/app/actions/auth";
import { Alert, Field, Input, Select } from "./ui";
import { SubmitButton, type ActionState } from "./forms";

function Msg({ s }: { s: ActionState }) {
  return <>{s.error && <Alert tone="error" className="mb-3">{s.error}</Alert>}{s.message && <Alert tone="success" className="mb-3">{s.message}</Alert>}</>;
}

export function ProfileForm({ user }: { user: { name: string; explanationLevel: string; timezone: string; gamificationEnabled: boolean; inAppReminders: boolean; emailReminders: boolean } }) {
  const [s, action] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="space-y-4">
      <Msg s={s} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name"><Input id="name" name="name" defaultValue={user.name} maxLength={80} /></Field>
        <Field id="explanationLevel" label="Default explanation level">
          <Select id="explanationLevel" name="explanationLevel" defaultValue={user.explanationLevel}>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </Select>
        </Field>
        <Field id="timezone" label="Time zone"><Input id="timezone" name="timezone" defaultValue={user.timezone} maxLength={64} /></Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Notifications and motivation</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inAppReminders" defaultChecked={user.inAppReminders} /> In-app study reminders (one per day at most)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="emailReminders" defaultChecked={user.emailReminders} /> Email reminders (requires a configured email provider)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="gamificationEnabled" defaultChecked={user.gamificationEnabled} /> Streaks and milestones</label>
      </fieldset>
      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [s, action] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="space-y-3">
      <Msg s={s} />
      <Field id="current" label="Current password"><Input id="current" name="current" type="password" autoComplete="current-password" /></Field>
      <Field id="next" label="New password" hint="At least 10 characters with a letter and a number."><Input id="next" name="next" type="password" autoComplete="new-password" /></Field>
      <Field id="confirm" label="Confirm new password"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" /></Field>
      <SubmitButton variant="secondary">Change password</SubmitButton>
    </form>
  );
}

export function ResendVerification() {
  const [s, action] = useActionState(async () => resendVerificationAction(), {});
  return (
    <form action={action}>
      <Msg s={s} />
      <SubmitButton size="sm" variant="secondary">Resend verification email</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [s, action] = useActionState(deleteAccountAction, {});
  return (
    <form action={action} className="space-y-3">
      <Msg s={s} />
      <Field id="del-pw" label="Password"><Input id="del-pw" name="password" type="password" autoComplete="current-password" /></Field>
      <Field id="del-confirm" label="Type DELETE to confirm"><Input id="del-confirm" name="confirm" /></Field>
      <SubmitButton variant="danger">Permanently delete my account</SubmitButton>
    </form>
  );
}

export function GroupForms() {
  const [c, create] = useActionState(createGroupAction, {});
  const [j, join] = useActionState(joinGroupAction, {});
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={create} className="space-y-3">
        <Msg s={c} />
        <Field id="gname" label="Create a group or accountability pair"><Input id="gname" name="name" maxLength={60} placeholder="e.g. CFA L1 May cohort" /></Field>
        <SubmitButton size="sm">Create</SubmitButton>
      </form>
      <form action={join} className="space-y-3">
        <Msg s={j} />
        <Field id="gcode" label="Join with an invite code"><Input id="gcode" name="code" maxLength={20} /></Field>
        <SubmitButton size="sm" variant="secondary">Join</SubmitButton>
      </form>
    </div>
  );
}

