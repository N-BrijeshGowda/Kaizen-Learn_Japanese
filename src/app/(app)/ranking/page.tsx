import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { getRanking } from "@/lib/ranking";
import type { Ranked } from "@/lib/ranking-core";

export const metadata: Metadata = { title: "Ranking" };

export default async function RankingPage() {
  const user = await requireUser();
  const { top, me, total } = await getRanking(user.id);

  return (
    <div className="grid gap-6">
      <header className="rise">
        <h1 className="text-3xl sm:text-4xl">Ranking</h1>
        <p className="mt-2 text-lg text-muted">
          {total} {total === 1 ? "learner" : "learners"}, ranked by points. Everyone sees your display name, level and points.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="card rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
        <table className="w-full text-left">
          <caption className="sr-only">Learners ranked by points</caption>
          <thead>
            <tr className="table-head text-xs font-semibold">
              <th scope="col" className="w-14 px-5 py-3">
                Rank
              </th>
              <th scope="col" className="py-3">
                Learner
              </th>
              <th scope="col" className="w-24 py-3">
                Level
              </th>
              <th scope="col" className="w-24 px-5 py-3 text-right">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {top.map((row) => (
              <Row key={row.userId} row={row} mine={row.userId === user.id} />
            ))}
            {me && (
              <>
                <tr aria-hidden="true">
                  <td colSpan={4} className="px-5 py-1 text-center text-muted">
                    ...
                  </td>
                </tr>
                <Row row={me} mine />
              </>
            )}
          </tbody>
        </table>
      </div>

      <section className="tile-soft rise p-6 lg:sticky lg:top-12" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="how-points">
        <h2 id="how-points" className="text-xl">
          How points are earned
        </h2>
        <ul className="mt-3 grid gap-1.5 text-sm text-ink-2">
          <li>10 points for each right answer in your first daily quiz of the day</li>
          <li>10 points for finishing a set, once per set</li>
          <li>50 points for finishing a level, once per level</li>
          <li>30 points for finishing a role-play, once per role-play</li>
          <li>10 points per right answer, plus 25, for passing an unlock quiz</li>
        </ul>
        <p className="mt-3 text-sm text-muted">Practice sets, retakes and level quizzes earn nothing, so they cannot be used to climb.</p>
      </section>
      </div>
    </div>
  );
}

function Row({ row, mine }: { row: Ranked; mine: boolean }) {
  return (
    <tr className={`border-b border-line last:border-b-0 ${mine ? "bg-accent-soft" : ""}`} aria-current={mine ? "true" : undefined}>
      <td className="px-5 py-3">
        <span className={`grid size-8 place-items-center rounded-full text-sm font-semibold ${row.rank <= 3 ? "bg-accent text-[var(--accent-ink)]" : "text-ink"}`}>{row.rank}</span>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-ink" aria-hidden="true">
            {row.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="truncate font-semibold text-ink">
            {row.name}
            {mine && <span className="ml-2 text-xs font-semibold text-accent">You</span>}
          </span>
        </div>
      </td>
      <td className="py-3 text-ink-2">Level {row.level}</td>
      <td className="px-5 py-3 text-right font-semibold text-ink">{row.points.toLocaleString("en-IN")}</td>
    </tr>
  );
}
