"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "@phosphor-icons/react";
import { sendJson } from "@/lib/client-api";

/** Approve, or mark Wrong with a reason. Wrong items go back to the admin to fix and republish. */
export function VerdictControls({ kind, id, target = "text" }: { kind: "item" | "line"; id: number; target?: "text" | "audio" }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = kind === "item" ? `/api/items/${id}/verdict` : `/api/roleplay-lines/${id}/verdict`;

  async function submit(verdict: "approved" | "wrong") {
    setError(null);
    if (verdict === "wrong" && reason.trim().length < 3) return setError("Say briefly what is wrong.");
    setBusy(true);
    const { ok, data } = await sendJson("POST", url, { verdict, reason: verdict === "wrong" ? reason : undefined, ...(kind === "item" ? { target } : {}) });
    setBusy(false);
    if (!ok) return setError(data.error ?? "Could not save that.");
    setAsking(false);
    setReason("");
    router.refresh();
  }

  return (
    <div className="min-w-[13rem]">
      {!asking ? (
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary !min-h-10 !px-3" onClick={() => submit("approved")} disabled={busy}>
            <Check size={16} weight="bold" aria-hidden="true" />
            Approved
          </button>
          <button type="button" className="btn btn-secondary !min-h-10 !px-3" onClick={() => setAsking(true)} disabled={busy}>
            <X size={16} weight="bold" aria-hidden="true" />
            Wrong
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="sr-only" htmlFor={`reason-${kind}-${id}`}>
            Why is it wrong?
          </label>
          <textarea
            id={`reason-${kind}-${id}`}
            className="input !min-h-20 py-2"
            placeholder="What is wrong, and what it should be"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary !min-h-10 !px-3" onClick={() => submit("wrong")} disabled={busy}>
              Mark wrong
            </button>
            <button type="button" className="btn btn-quiet !min-h-10 !px-3" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-[var(--tag-red-ink)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
