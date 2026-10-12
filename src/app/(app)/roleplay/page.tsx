import type { Metadata } from "next";
import Link from "next/link";
import { CaretRight, Lock } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/dal";
import { listRoleplays } from "@/lib/roleplay";
import { TIERS } from "@/lib/roleplay-core";

export const metadata: Metadata = { title: "Role-play" };

const TIER_NOTE: Record<string, string> = {
  Starter: "3 to 4 short lines.",
  Easy: "Simple questions and answers.",
  Medium: "Everyday work talk.",
  Challenge: "Longer sentences, phone calls and polite refusals.",
};

export default async function RolePlayPage() {
  const user = await requireUser();
  const all = await listRoleplays(user.id);
  const done = all.filter((r) => r.completed).length;
  const percent = all.length ? Math.round((done / all.length) * 100) : 0;

  return (
    <div className="grid gap-10">
      <header className="rise max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">Role-play</h1>
        <p className="mt-2 text-lg text-muted">Short office conversations. Finish one to open the next.</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="progress max-w-56 flex-1" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Role-plays done">
            <i style={{ width: `${percent}%` }} />
          </div>
          <span className="text-sm font-semibold text-ink">
            {done} of {all.length} done
          </span>
        </div>
      </header>

      {TIERS.map((tier, t) => {
        const rows = all.filter((r) => r.tier === tier);
        if (!rows.length) return null;
        return (
          <section key={tier} className="rise" style={{ "--i": t + 1 } as React.CSSProperties} aria-labelledby={`tier-${tier}`}>
            <div className="mb-4">
              <h2 id={`tier-${tier}`} className="text-2xl">
                {tier}
              </h2>
              <p className="mt-0.5 text-muted">{TIER_NOTE[tier]}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((r) => {
                const inner = (
                  <div className="flex h-full items-start gap-4">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-lg font-semibold ${r.open ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>
                      {r.open ? r.order : <Lock size={18} weight="bold" aria-label="Locked" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${r.open ? "text-ink" : "text-muted"}`}>{r.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted">{r.open ? r.scene : "Finish the one before to open this"}</p>
                      {r.open && <span className={`tag mt-3 ${r.completed ? "tag-green" : "tag-blue"}`}>{r.completed ? "Done" : "Ready"}</span>}
                    </div>
                    {r.open && <CaretRight size={18} weight="bold" className="mt-3 shrink-0 text-muted" aria-hidden="true" />}
                  </div>
                );
                return (
                  <li key={r.id}>
                    {r.open ? (
                      <Link href={`/roleplay/${r.id}`} className="card card-link block h-full p-5">
                        {inner}
                      </Link>
                    ) : (
                      <div className="card h-full p-5" aria-disabled="true">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
