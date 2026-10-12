import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Lock } from "@phosphor-icons/react/dist/ssr";
import { PlayButton } from "@/components/app/PlayButton";
import { requireUser } from "@/lib/dal";
import { getCurriculum, kindLabel, kindNoun } from "@/lib/curriculum";

export const metadata: Metadata = { title: "Level" };

export default async function LevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ set?: string }>;
}) {
  const user = await requireUser();
  const { level: levelParam } = await params;
  const { set: setParam } = await searchParams;

  const levelId = Number(levelParam);
  if (!Number.isInteger(levelId)) notFound();

  const levels = await getCurriculum(user.id);
  const level = levels.find((l) => l.id === levelId);
  if (!level) notFound();
  if (!level.unlocked) redirect("/learn");

  // The set shown: the one in the address if it is open, else the first unfinished set.
  const requested = level.sets.find((s) => s.order === Number(setParam));
  const selected = requested?.open ? requested : (level.sets.find((s) => s.open && !s.finished) ?? level.sets[level.sets.length - 1]);

  const percent = level.total ? Math.round((level.learned / level.total) * 100) : 0;
  const startLabel = selected.finished ? `Practise set ${selected.order} again` : selected.learned > 0 ? `Continue set ${selected.order}` : `Start set ${selected.order}`;
  const startIndex = selected.finished ? 0 : Math.max(0, selected.items.findIndex((i) => !i.learned));

  const quizCard = (
    <>
      <p className="text-sm text-ink-2">5 questions from this level. Take it as often as you like to keep the words fresh.</p>
      <Link href={`/quiz/level/${level.id}`} className="btn btn-secondary mt-4">
        Take the level quiz
      </Link>
    </>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[19rem_1fr] lg:gap-10">
      <aside className="rise grid gap-6 lg:sticky lg:top-12">
        <div>
          <Link href="/learn" className="btn btn-quiet -ml-3">
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            Learn
          </Link>
          <h1 className="mt-3 text-3xl">
            Level {level.id}: {level.name}
          </h1>
          <p className="mt-2 text-muted">{level.subtitle}</p>
          <span className="tag tag-neutral mt-4">{kindLabel(level.kind)}s</span>
        </div>

        <div className="tile-soft p-5">
          <p className="text-4xl font-semibold text-ink">{percent}%</p>
          <div className="progress mt-3 !bg-surface" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Level progress">
            <i style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink-2">
            {level.learned} of {level.total} {kindNoun(level.kind)} learned
          </p>
        </div>

        <nav aria-label="Sets">
          <ul className="flex flex-wrap gap-2">
            {level.sets.map((set) => {
              const active = set.id === selected.id;
              return (
                <li key={set.id}>
                  {set.open ? (
                    <Link href={`/learn/${level.id}?set=${set.order}`} className="chip" aria-current={active ? "true" : undefined}>
                      {set.finished && <Check size={14} weight="bold" aria-label="Finished" />}
                      Set {set.order}
                    </Link>
                  ) : (
                    <span className="chip opacity-60" aria-disabled="true">
                      <Lock size={14} weight="bold" aria-label="Locked" />
                      Set {set.order}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="card hidden p-5 lg:block">{quizCard}</div>
      </aside>

      <div className="grid gap-6">
        {level.completed && (
          <div className="notice notice-ok rise !mb-0" style={{ "--i": 1 } as React.CSSProperties}>
            Level complete. Open any set and tap an item to practise it again.
          </div>
        )}

        <section className="card rise overflow-hidden" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="set-title">
          <div className="flex items-center justify-between gap-4 px-6 pb-4 pt-6">
            <h2 id="set-title" className="text-xl">
              Set {selected.order}: {selected.name}
            </h2>
            <span className="text-sm text-muted">
              {selected.learned} of {selected.items.length} learned
            </span>
          </div>
          <ul>
            {selected.items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-2 border-t border-line pr-4 first:border-t-0">
                <Link
                  href={`/learn/${level.id}/${selected.order}/lesson?i=${i}`}
                  className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-4 py-3 pl-6 transition-colors hover:bg-surface-2"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      item.learned ? "bg-accent text-[var(--accent-ink)]" : "border border-line-strong text-muted"
                    }`}
                  >
                    {item.learned ? <Check size={14} weight="bold" aria-label="Learned" /> : item.order}
                  </span>
                  <span className="min-w-0">
                    <span className="jp block truncate text-xl text-ink" lang="ja">
                      {item.kana}
                    </span>
                    {user.showRomaji && <span className="block truncate text-sm text-muted">{item.romaji}</span>}
                    <span className="block truncate text-sm text-ink-2">{item.english}</span>
                  </span>
                </Link>
                <PlayButton text={item.kana} label={item.english} />
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-4">
            <Link href={`/learn/${level.id}/${selected.order}/lesson?i=${startIndex}`} className="btn btn-primary btn-block sm:w-auto">
              {startLabel}
            </Link>
          </div>
        </section>

        <div className="card rise p-5 lg:hidden" style={{ "--i": 3 } as React.CSSProperties}>
          {quizCard}
        </div>
      </div>
    </div>
  );
}
