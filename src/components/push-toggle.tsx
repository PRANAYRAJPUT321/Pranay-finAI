"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "unsupported" | "default" | "denied" | "granted" | "subscribed";

/** Lets a learner enable browser / device notifications. Uses web push when the server has VAPID keys. */
export function PushToggle() {
  const [state, setState] = useState<State>("default");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      if (Notification.permission === "granted") {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        return setState(sub ? "subscribed" : "granted");
      }
    })();
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        return;
      }
      setState("granted");
      const cfg: { publicKey: string | null } = await fetch("/api/push/subscribe").then((r) => r.json());
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      if (cfg.publicKey && reg.pushManager) {
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) });
        const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
        if (!res.ok) throw new Error("subscribe failed");
        setState("subscribed");
        setMsg("Done — reminders will reach this device even when the app is closed.");
      } else {
        setMsg("Browser alerts are on while PD FinPrep is open. Background push needs the site owner to configure web push.");
      }
      reg.showNotification("Notifications enabled", { body: "You'll get study reminders, exam countdowns and registration deadlines.", icon: "/icons/icon-192.png" });
    } catch {
      setMsg("Couldn't enable notifications on this device. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe();
    }
    setState("granted");
    setMsg("Device push turned off. In-app notifications continue.");
    setBusy(false);
  };

  return (
    <div className="space-y-2">
      {state === "unsupported" && <p className="text-sm text-slate-600">This browser doesn&apos;t support notifications. On iPhone, add PD FinPrep to your Home Screen first, then enable them here.</p>}
      {state === "denied" && <p className="text-sm text-slate-600">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then reload.</p>}
      {(state === "default" || state === "granted") && (
        <button type="button" onClick={enable} disabled={busy} className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-gold-500/30 transition hover:-translate-y-0.5 disabled:opacity-60">
          <BellRing className="h-4 w-4" aria-hidden /> {busy ? "Enabling…" : "Enable notifications on this device"}
        </button>
      )}
      {state === "subscribed" && (
        <button type="button" onClick={disable} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-slate-50 disabled:opacity-60">
          <BellOff className="h-4 w-4" aria-hidden /> Turn off device push
        </button>
      )}
      {msg && <p className="text-sm text-slate-600" role="status">{msg}</p>}
    </div>
  );
}
