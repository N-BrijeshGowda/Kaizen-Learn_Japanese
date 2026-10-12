"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { Brand } from "@/components/app/Brand";

async function patchMe(body: Record<string, unknown>) {
  const res = await fetch("/api/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: data.error };
}

const TOUR = [
  { title: "Start with single words", body: "Level 1 teaches words you will hear all day. Later levels turn them into phrases, then sentences." },
  { title: "Build up level by level", body: "Each level reuses the one before it, so what you learned yesterday keeps coming back." },
  {
    title: "Quiz, role-play, and climb the ranking",
    body: "Take a short daily quiz and practise office conversations. Or unlock a higher level with a quiz. The ranking shows every learner's display name, level and points.",
  },
];

export function OnboardingFlow({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(initialName);
  const [showRomaji, setShowRomaji] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function next(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Tell us what to call you.");
    setBusy(true);
    const result = await patchMe({ name: name.trim(), showRomaji }).catch(() => ({ ok: false, error: "We could not reach the server." }));
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Something went wrong. Please try again.");
    setStep(2);
  }

  async function finish() {
    setError(null);
    setBusy(true);
    const result = await patchMe({ completeOnboarding: true }).catch(() => ({ ok: false, error: "We could not reach the server." }));
    if (!result.ok) {
      setBusy(false);
      return setError(result.error ?? "Something went wrong. Please try again.");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Brand href={null} />
        <div className="flex gap-1.5" role="img" aria-label={`Step ${step} of 2`}>
          {[1, 2].map((n) => (
            <i key={n} className={`block h-1.5 w-8 rounded-full ${n <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={next} noValidate className="rise">
          <h1 className="text-4xl">Welcome to Kaizen</h1>
          <p className="mb-8 mt-3 text-ink-2">Two quick choices, and you can change both later in Settings.</p>

          <label className="field">
            <span>What should we call you?</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
            <span className="help font-normal">Other learners see this name in the ranking.</span>
          </label>

          <fieldset className="mb-6">
            <legend className="mb-2 text-sm font-semibold text-ink">How should Japanese be shown?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: true, title: "With romaji", sample: "ohayoo gozaimasu", note: "Kana plus English letters. Best if you cannot read kana yet." },
                { value: false, title: "Kana only", sample: "おはようございます", note: "Kana without help. Reading is never tested either way." },
              ].map((opt) => (
                <label
                  key={opt.title}
                  className={`card cursor-pointer p-4 transition-colors ${showRomaji === opt.value ? "border-accent bg-accent-soft" : "hover:border-line-strong"}`}
                >
                  <input type="radio" name="script" className="sr-only" checked={showRomaji === opt.value} onChange={() => setShowRomaji(opt.value)} />
                  <div className="font-semibold text-ink">{opt.title}</div>
                  <div className="jp my-1 text-lg text-ink">{opt.sample}</div>
                  <div className="text-sm text-muted">{opt.note}</div>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Continue
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </button>
        </form>
      ) : (
        <div className="rise">
          <h1 className="text-4xl">How Kaizen works</h1>
          <ol className="my-8 grid gap-5">
            {TOUR.map((point, i) => (
              <li key={point.title} className="grid grid-cols-[2.25rem_1fr] gap-4">
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
                <div>
                  <h2 className="text-xl">{point.title}</h2>
                  <p className="mt-1 text-ink-2">{point.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button className="btn btn-quiet" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary" type="button" onClick={finish} disabled={busy}>
              Start learning
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
