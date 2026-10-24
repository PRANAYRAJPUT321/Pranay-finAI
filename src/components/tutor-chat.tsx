"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Alert, Button, Textarea, cx } from "./ui";

interface Msg {
  id: string;
  role: string;
  content: string;
  citations?: { ref: string; title: string; href: string }[] | null;
  provider?: string | null;
}

/** Minimal, safe rendering: paragraphs, numbered/bulleted lines and **bold** — no HTML injection. */
function Rich({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((block, i) => (
        <p key={i} className="whitespace-pre-line">
          {block.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part.startsWith("_") && part.endsWith("_") && part.length > 2 ? <em key={j} className="text-slate-500">{part.slice(1, -1)}</em> : <span key={j}>{part}</span>,
          )}
        </p>
      ))}
    </div>
  );
}

export function TutorChat({ sessionId, initial, lessonId, placeholder }: { sessionId: string; initial: Msg[]; lessonId?: string | null; placeholder: string }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content }]);
    setText("");
    try {
      const res = await fetch(`/api/tutor/${sessionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, lessonId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The tutor could not respond");
      setMessages((m) => [...m, data.message]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4" aria-live="polite">
        {messages.length === 0 && <p className="text-sm text-slate-500">Ask a question to get started.</p>}
        {messages.map((m) => (
          <div key={m.id} className={cx("max-w-3xl rounded-xl px-4 py-3 text-sm", m.role === "user" ? "ml-auto bg-navy-900 text-white" : "border border-slate-200 bg-white text-slate-800")}>
            {m.role === "user" ? <p className="whitespace-pre-line">{m.content}</p> : <Rich text={m.content} />}
            {m.role === "assistant" && (m.citations?.length ?? 0) > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">
                Sources:{" "}
                {m.citations!.map((c, i) => (
                  <span key={c.ref}>{i > 0 && " · "}<Link href={c.href} className="underline">[{c.ref}] {c.title}</Link></span>
                ))}
              </div>
            )}
            {m.role === "assistant" && m.provider && <p className="mt-1 text-[11px] text-slate-400">via {m.provider}</p>}
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500">Thinking…</p>}
        <div ref={endRef} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <form
        className="sticky bottom-0 flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="tutor-input" className="sr-only">Message the tutor</label>
        <Textarea
          id="tutor-input"
          rows={2}
          value={text}
          maxLength={4000}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="border-0 shadow-none focus:ring-0"
        />
        <Button type="submit" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" aria-hidden /></Button>
      </form>
    </div>
  );
}
