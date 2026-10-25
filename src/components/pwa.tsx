"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Registers the service worker and captures the browser's install prompt. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      listeners.forEach((l) => l());
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

function useInstallState() {
  const [, force] = useState(0);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const update = () => force((n) => n + 1);
    listeners.add(update);
    const t = setTimeout(() => {
      setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    }, 0);
    return () => {
      listeners.delete(update);
      clearTimeout(t);
    };
  }, []);
  return { canPrompt: !!deferredPrompt, standalone, ios };
}

export function InstallAppButton({ className = "", variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  const { canPrompt, standalone, ios } = useInstallState();
  const [msg, setMsg] = useState<string | null>(null);
  if (standalone) return <p className={`text-sm ${variant === "dark" ? "text-mint-200" : "text-mint-600"}`}>✓ PD FinPrep is installed on this device.</p>;
  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          if (deferredPrompt) {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            deferredPrompt = null;
            setMsg(choice.outcome === "accepted" ? "Installing… look for PD FinPrep on your home screen." : "Install cancelled.");
          } else if (ios) {
            setMsg("On iPhone/iPad: tap the Share button in Safari, then “Add to Home Screen”.");
          } else {
            setMsg("Use your browser menu → “Install app” (or “Add to Home screen” on Android).");
          }
        }}
        className={variant === "dark" ? "pill-outline" : "pill-outline pill-outline-dark"}
      >
        {canPrompt ? <Download className="h-4 w-4" aria-hidden /> : ios ? <Share className="h-4 w-4" aria-hidden /> : <Smartphone className="h-4 w-4" aria-hidden />}
        Install the app
      </button>
      {msg && <p className={`mt-2 text-xs ${variant === "dark" ? "text-navy-100" : "text-slate-600"}`} role="status">{msg}</p>}
    </div>
  );
}
