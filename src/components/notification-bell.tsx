"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

type Item = { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string };

const POLL_MS = 60_000;

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Header bell: polls for new notifications and raises a browser notification for new ones when allowed. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data: { unread: number; items: Item[] } = await res.json();
      setUnread(data.unread);
      setItems(data.items);
      if (seen.current) {
        const fresh = data.items.filter((i) => !i.readAt && !seen.current!.has(i.id));
        if (fresh.length && typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState === "hidden") {
          const reg = await navigator.serviceWorker?.getRegistration();
          for (const n of fresh.slice(0, 3)) {
            const opts = { body: n.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: n.id, data: { url: n.link ?? "/notifications" } };
            if (reg) await reg.showNotification(n.title, opts);
            else new Notification(n.title, opts);
          }
        }
      }
      seen.current = new Set(data.items.map((i) => i.id));
    } catch {
      /* offline — try again next tick */
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 1500);
    const t = setInterval(load, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const markRead = async (id?: string) => {
    setItems((xs) => xs?.map((i) => (!id || i.id === id ? { ...i, readAt: i.readAt ?? new Date().toISOString() } : i)) ?? null);
    setUnread((u) => (id ? Math.max(0, u - 1) : 0));
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(id ? { id } : {}) }).catch(() => {});
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!items) load();
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-full p-2 text-white/90 transition hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && <span className="pulse-ring absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="animate-fade-up absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl ring-1 ring-black/10">
          <div className="bg-ink flex items-center justify-between px-4 py-3 text-white">
            <p className="eyebrow text-[0.65rem] text-mint-300">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => markRead()} className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white">
                <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {items === null && <li className="p-4"><div className="skeleton h-10 rounded" /></li>}
            {items?.length === 0 && <li className="p-6 text-center text-sm text-slate-500">You&apos;re all caught up.</li>}
            {items?.map((n) => (
              <li key={n.id} className={n.readAt ? "" : "bg-gold-50/60"}>
                <Link href={n.link ?? "/notifications"} onClick={() => { if (!n.readAt) markRead(n.id); setOpen(false); }} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-slate-300" : "bg-gold-500"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy-900">{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-slate-600">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{ago(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-navy-800 hover:bg-slate-50">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
