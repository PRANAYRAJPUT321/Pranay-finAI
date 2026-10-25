import { Alert, Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { PushToggle } from "@/components/push-toggle";
import { InstallAppButton } from "@/components/pwa";
import { DeleteAccountForm, PasswordForm, ProfileForm, ResendVerification } from "@/components/account-forms";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { env } from "@/server/env";

export const metadata = { title: "Settings" };

const TIERS = [
  { key: "FREE", name: "Free", items: ["Limited practice", "Basic study plan", "Selected lessons", "Progress dashboard"] },
  { key: "PLUS", name: "Plus", items: ["Larger question bank", "Adaptive plans", "Full analytics", "Additional mock exams"] },
  { key: "PREMIUM", name: "Premium", items: ["Advanced AI tutoring", "Detailed performance analysis", "Expanded learning resources"] },
];

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" />
      <Card>
        <CardTitle>Profile and preferences</CardTitle>
        <p className="mb-4 text-sm text-slate-600">{user.email} {user.emailVerifiedAt ? <Badge tone="green">verified</Badge> : <Badge tone="amber">not verified</Badge>}</p>
        {!user.emailVerifiedAt && <div className="mb-4"><ResendVerification /></div>}
        <ProfileForm user={user} />
      </Card>
      <Card>
        <CardTitle>Notifications &amp; app</CardTitle>
        <p className="mb-4 text-sm text-slate-600">In-app reminders follow the preference above. Enable device notifications to receive them on this phone or computer, and install PD FinPrep for a full-screen app.</p>
        <div className="flex flex-wrap items-start gap-6">
          <PushToggle />
          <InstallAppButton variant="light" />
        </div>
      </Card>
      <Card>
        <CardTitle>Password</CardTitle>
        <PasswordForm />
      </Card>
      <Card>
        <CardTitle>Plan and billing</CardTitle>
        <Alert tone="info" className="mb-4">
          Billing is not integrated yet, so no payments can be taken and no paid plan can be purchased.
          {env.enforceEntitlements ? " Entitlement enforcement is ON." : " During development every feature is available on all tiers."}
        </Alert>
        <div className="grid gap-3 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.key} className={`rounded-lg border p-4 ${user.tier === t.key ? "border-gold-400 bg-gold-50" : "border-slate-200"}`}>
              <p className="font-semibold text-navy-900">{t.name} {user.tier === t.key && <Badge tone="gold">Current</Badge>}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{t.items.map((i) => <li key={i}>{i}</li>)}</ul>
              {t.key !== "FREE" && <p className="mt-3 text-xs text-slate-500">Upgrade unavailable — payment provider not configured.</p>}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>Your data</CardTitle>
        <p className="text-sm text-slate-600">We store your account details and learning activity to run your preparation. <a href="/privacy" className="underline">What we store and why</a>.</p>
        <a href="/api/account/export" className="mt-3 inline-flex rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">Download all my data (JSON)</a>
      </Card>
      <Card className="border-red-200">
        <CardTitle>Delete account</CardTitle>
        <p className="mb-3 text-sm text-slate-600">Permanently deletes your account, plans, attempts, notes, flashcards and tutor conversations. This cannot be undone.</p>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
