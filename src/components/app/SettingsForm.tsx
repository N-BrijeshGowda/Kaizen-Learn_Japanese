"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsForm({ initialName, initialShowRomaji }: { initialName: string; initialShowRomaji: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [showRomaji, setShowRomaji] = useState(initialShowRomaji);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!name.trim()) return setMessage({ kind: "error", text: "Your name cannot be empty." });
    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), showRomaji }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setMessage({ kind: "error", text: data.error ?? "Something went wrong. Please try again." });
      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "We could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="card p-6">
      <label className="field">
        <span>Display name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
        <span className="help font-normal">Other learners see this name in the ranking.</span>
      </label>

      <label className="mb-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={showRomaji}
          onChange={(e) => setShowRomaji(e.target.checked)}
          className="mt-1 size-5 accent-[var(--accent)]"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">Show romaji</span>
          <span className="help">Turn off to see kana only. Reading is never tested either way.</span>
        </span>
      </label>

      {message && (
        <div className={`notice ${message.kind === "ok" ? "notice-ok" : "notice-error"}`} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving" : "Save changes"}
      </button>
    </form>
  );
}
