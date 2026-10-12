import type { Metadata } from "next";
import Link from "next/link";
import { CaretRight, Lock } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/dal";
import { getCurriculum, kindNoun } from "@/lib/curriculum";

export const metadata: Metadata = { title: "Learn" };

export default async function LearnPage() {
  const user = await requireUser();
  const levels = await getCurriculum(user.id);

  return (
    <div className="grid gap-6">
      <header className="rise">
        <h1 className="text-3xl sm:text-4xl">Learn</h1>
        <p className="mt-2 text-lg text-muted">Five levels, from single words to longer sentences.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_19rem]">
      <ul className="grid gap-4">
        {levels.map((level, i) => {
          const percent = level.total ? Math.round((level.learned / level.total) * 100) : 0;
          const body = (
            <div className="flex items-start gap-5">
              <span
                className={`grid size-16 shrink-0 place-items-center rounded-lg text-3xl font-semibold ${
                  level.unlocked ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
                }`}
              >
                {level.unlocked ? level.id : <Lock size={24} weight="bold" aria-label="Locked" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-xl">
                    Level {level.id}: {level.name}
                  </h2>
                  {level.unlocked && <span className={`tag ${level.completed ? "tag-green" : "tag-blue"}`}>{level.completed ? "Complete" : "Open"}</span>}
                </div>
                <p className="mt-1 text-muted">{level.subtitle}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {level.sets.length} sets, {level.total} {kindNoun(level.kind)}
                </p>

                {level.unlocked && (
                  <div className="mt-4">
                    <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${level.id} progress`}>
                      <i style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      {level.learned} of {level.total} {kindNoun(level.kind)} learned
                    </p>
                  </div>
                )}
                {!level.unlocked && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link href={`/quiz/unlock/${level.id}`} className="btn btn-secondary">
                      Unlock with a quiz
                    </Link>
                    <span className="text-sm text-muted">4 out of 5 opens it.</span>
                  </div>
                )}
              </div>
              {level.unlocked && <CaretRight size={22} weight="bold" className="mt-5 shrink-0 text-muted" aria-hidden="true" />}
            </div>
          );

          const style = { "--i": i + 1 } as React.CSSProperties;
          return (
            <li key={level.id} className="rise" style={style}>
              {level.unlocked ? (
                <Link href={`/learn/${level.id}`} className="card card-link block p-5 sm:p-6">
                  {body}
                </Link>
              ) : (
                <div className="card p-5 sm:p-6">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="tile-soft rise p-6 text-ink-2 lg:sticky lg:top-12" style={{ "--i": 6 } as React.CSSProperties}>
        A level opens when you finish the one before it. Or open a higher level at once by passing a 5 question quiz drawn from the levels below it (4 correct needed). You can try as often as you like.
      </p>
      </div>
    </div>
  );
}
