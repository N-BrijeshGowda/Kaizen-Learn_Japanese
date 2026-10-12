"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, STATUS_TAG } from "@/components/manage/AdminTabs";
import { PlayButton } from "@/components/app/PlayButton";
import { sendJson } from "@/lib/client-api";

type Feedback = { kind: "ok" | "error"; text: string } | null;

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <div className={`notice ${feedback.kind === "ok" ? "notice-ok" : "notice-error"} mb-0 mt-3`} role={feedback.kind === "error" ? "alert" : "status"}>
      {feedback.text}
    </div>
  );
}

/** Publish or unpublish a level or a role-play. Only published content reaches learners. */
export function PublishToggle({ url, status }: { url: string; status: "draft" | "published" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const { ok, data } = await sendJson("PATCH", url, { status: status === "published" ? "draft" : "published" });
    setBusy(false);
    if (!ok) return setError(data.error ?? "Could not change that.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`tag ${status === "published" ? "tag-green" : "tag-neutral"}`}>{status === "published" ? "Published" : "Draft"}</span>
      <button type="button" className="btn btn-secondary !min-h-9 !px-3" onClick={toggle} disabled={busy}>
        {status === "published" ? "Unpublish" : "Publish"}
      </button>
      {error && (
        <span className="text-sm text-[var(--tag-red-ink)]" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** A small form of text fields that saves to one PATCH endpoint. */
export function FieldsForm({ url, fields, values, button = "Save" }: { url: string; fields: { name: string; label: string; max: number }[]; values: Record<string, string>; button?: string }) {
  const router = useRouter();
  const [state, setState] = useState(values);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const { ok, data } = await sendJson("PATCH", url, state);
    setBusy(false);
    if (!ok) return setFeedback({ kind: "error", text: data.error ?? "Could not save." });
    setFeedback({ kind: "ok", text: "Saved." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.name} className="field">
            <span>{f.label}</span>
            <input className="input" value={state[f.name] ?? ""} maxLength={f.max} onChange={(e) => setState({ ...state, [f.name]: e.target.value })} />
          </label>
        ))}
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving" : button}
      </button>
      <Message feedback={feedback} />
    </form>
  );
}

type ItemValues = { kana: string; romaji: string; english: string; note: string; parts: string };

export function ItemEditor({
  id,
  order,
  reviewStatus,
  version,
  wrongReason,
  initial,
}: {
  id: number;
  order: number;
  reviewStatus: string;
  version: number;
  wrongReason: string | null;
  initial: ItemValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const { ok, data } = await sendJson<{ audioNeedsRegeneration?: boolean }>("PATCH", `/api/admin/items/${id}`, { ...v, parts: v.parts.trim() ? v.parts : null });
    setBusy(false);
    if (!ok) return setFeedback({ kind: "error", text: data.error ?? "Could not save." });
    setFeedback({ kind: "ok", text: data.audioNeedsRegeneration ? "Saved and live. The spoken text changed, so its audio needs to be generated again." : "Saved and live." });
    router.refresh();
  }

  return (
    <details className="group border-t border-line first:border-t-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-surface-2">
        <span className="w-6 text-sm font-semibold text-muted">{order}</span>
        <span className="jp min-w-0 flex-1 truncate text-ink" lang="ja">
          {initial.kana}
          <span className="ml-3 text-sm text-muted">{initial.english}</span>
        </span>
        <span className={`tag ${STATUS_TAG[reviewStatus]}`}>{STATUS_LABEL[reviewStatus]}</span>
        <span className="hidden text-xs text-muted sm:inline">v{version}</span>
      </summary>
      <form onSubmit={save} noValidate className="border-t border-line bg-surface-2 px-5 py-5">
        {wrongReason && (
          <div className="notice notice-error" role="note">
            Reviewer says this is wrong: {wrongReason}
          </div>
        )}
        <div className="grid gap-x-4 sm:grid-cols-3">
          <label className="field">
            <span>Kana</span>
            <input className="input jp" value={v.kana} maxLength={255} onChange={(e) => setV({ ...v, kana: e.target.value })} lang="ja" />
          </label>
          <label className="field">
            <span>Romaji</span>
            <input className="input" value={v.romaji} maxLength={255} onChange={(e) => setV({ ...v, romaji: e.target.value })} />
          </label>
          <label className="field">
            <span>English</span>
            <input className="input" value={v.english} maxLength={255} onChange={(e) => setV({ ...v, english: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Usage note</span>
          <textarea className="input !min-h-20 py-2" value={v.note} maxLength={1000} onChange={(e) => setV({ ...v, note: e.target.value })} />
          <span className="help font-normal">One or two sentences on when and how to use it.</span>
        </label>
        <label className="field">
          <span>Built from (optional)</span>
          <textarea
            className="input !min-h-20 py-2 jp"
            value={v.parts}
            maxLength={2000}
            onChange={(e) => setV({ ...v, parts: e.target.value })}
            placeholder="おはよう | ohayoo | good morning"
            lang="ja"
          />
          <span className="help font-normal">One part per line: kana | romaji | meaning.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving" : "Save and publish"}
          </button>
          <PlayButton text={v.kana} label={v.english} />
          <span className="text-sm text-muted">Changing the text sends this item back to Draft for the reviewer.</span>
        </div>
        <Message feedback={feedback} />
      </form>
    </details>
  );
}

export function LineEditor({
  id,
  order,
  speaker,
  reviewStatus,
  version,
  note,
  initial,
}: {
  id: number;
  order: number;
  speaker: "colleague" | "you";
  reviewStatus: string;
  version: number;
  note: string | null;
  initial: { kana: string; romaji: string; english: string };
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const { ok, data } = await sendJson("PATCH", `/api/admin/roleplay-lines/${id}`, v);
    setBusy(false);
    if (!ok) return setFeedback({ kind: "error", text: data.error ?? "Could not save." });
    setFeedback({ kind: "ok", text: "Saved and live." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="border-t border-line px-5 py-5 first:border-t-0">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-ink">
          Line {order}: {speaker === "you" ? "You" : "Colleague"}
        </span>
        <span className={`tag ${STATUS_TAG[reviewStatus]}`}>{STATUS_LABEL[reviewStatus]}</span>
        <span className="text-xs text-muted">v{version}</span>
      </div>
      {note && (
        <div className="notice notice-error" role="note">
          Reviewer says this is wrong: {note}
        </div>
      )}
      <div className="grid gap-x-4 sm:grid-cols-3">
        {(["kana", "romaji", "english"] as const).map((key) => (
          <label key={key} className="field">
            <span>{key === "kana" ? "Kana" : key === "romaji" ? "Romaji" : "English"}</span>
            <input className={`input ${key === "kana" ? "jp" : ""}`} value={v[key]} maxLength={255} onChange={(e) => setV({ ...v, [key]: e.target.value })} lang={key === "kana" ? "ja" : undefined} />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving" : "Save and publish"}
        </button>
        <PlayButton text={v.kana} label={v.english} />
      </div>
      <Message feedback={feedback} />
    </form>
  );
}
