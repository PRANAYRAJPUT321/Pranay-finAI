import QRCode from "qrcode";
import { BellRing, Monitor, Smartphone, Tablet, WifiOff } from "lucide-react";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { InstallAppButton } from "@/components/pwa";
import { PushToggle } from "@/components/push-toggle";
import { env } from "@/server/env";

export const metadata = { title: "Get the App" };

const STEPS = [
  { icon: Smartphone, title: "Android (Chrome)", steps: ["Tap “Install the app” below — or open the ⋮ menu.", "Choose “Install app” / “Add to Home screen”.", "Open PD FinPrep from your home screen."] },
  { icon: Tablet, title: "iPhone & iPad (Safari)", steps: ["Open this page in Safari.", "Tap the Share button.", "Choose “Add to Home Screen”, then “Add”."] },
  { icon: Monitor, title: "Windows & macOS (Chrome / Edge)", steps: ["Click the install icon in the address bar,", "or use the browser menu → “Install PD FinPrep”.", "It opens in its own window like a desktop app."] },
];

export default async function GetAppPage() {
  const url = env.appUrl.replace(/\/$/, "") + "/dashboard";
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#070f0c", light: "#ffffff" } });
  return (
    <>
      <PageHeader
        eyebrow="Account / Mobile & desktop"
        title="Get The App"
        description="PD FinPrep installs straight from your browser — no app store needed. You get a full-screen app, a home-screen icon, offline access to pages you've opened and study reminders."
        actions={<InstallAppButton />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, steps }) => (
              <Card key={title}>
                <Icon className="h-6 w-6 text-gold-500" aria-hidden />
                <p className="font-display mt-3 text-lg font-bold text-navy-950">{title}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </Card>
            ))}
          </div>
          <Card>
            <CardTitle><BellRing className="mr-1 inline h-5 w-5 text-gold-500" aria-hidden /> Notifications on this device</CardTitle>
            <p className="mb-4 text-sm text-slate-600">Get today&apos;s plan, due flashcards, exam countdowns (60, 30, 14, 7, 3 and 1 days) and registration-deadline reminders. You can switch reminders off any time in Settings.</p>
            <PushToggle />
          </Card>
          <Card>
            <CardTitle><WifiOff className="mr-1 inline h-5 w-5 text-gold-500" aria-hidden /> Offline</CardTitle>
            <p className="text-sm text-slate-600">Pages you have opened recently stay available when you lose connection, and you can download PDF notes from Study Materials to read anywhere. Practice, mocks and the tutor need a connection so your progress is saved.</p>
          </Card>
        </div>
        <aside className="bg-ink relative h-fit overflow-hidden rounded-3xl p-6 text-center text-white">
          <span aria-hidden className="red-beam left-[60%]" />
          <p className="eyebrow relative text-mint-300">Scan to open on your phone</p>
          <div className="relative mx-auto mt-5 w-52 rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`QR code for ${url}`} />
          <p className="relative mt-4 break-all text-xs text-navy-100">{url}</p>
          <span aria-hidden className="rule-red relative mx-auto mt-4" />
          <p className="relative mt-3 text-xs text-navy-200">Then use your browser&apos;s “Install” or “Add to Home Screen”.</p>
        </aside>
      </div>
    </>
  );
}
