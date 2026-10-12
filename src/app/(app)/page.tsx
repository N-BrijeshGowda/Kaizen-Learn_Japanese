import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Fire, Medal, Star } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { findCurrent, getCurriculum, highestUnlocked } from "@/lib/curriculum";
import { GOAL_ITEMS, goalProgress } from "@/lib/goal";
import { totalPoints } from "@/lib/learning";
import { todaysDailyScore } from "@/lib/quiz";
import { readStreak } from "@/lib/streak";
import { dateOnly, greetingFor, istDateString, longDateIst } from "@/lib/time";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const user = await requireUser();
  const today = dateOnly(istDateString());

  const [levels, points, streak, activity, quizScore] = await Promise.all([
    getCurriculum(user.id),
    totalPoints(user.id),
    readStreak(user.id),
    prisma.dailyActivity.findUnique({ where: { userId_localDate: { userId: user.id, localDate: today } } }),
    todaysDailyScore(user.id),
  ]);

  const itemsToday = activity?.itemsLearned ?? 0;
  const quizDone = activity?.quizDone ?? false;
  const { percent } = goalProgress(itemsToday, quizDone);
  const current = findCurrent(levels);
  const level = highestUnlocked(levels);
  const learnedAll = levels.reduce((n, l) => n + l.learned, 0);
  const totalAll = levels.reduce((n, l) => n + l.total, 0);

  const continueHref = current
    ? `/learn/${current.level.id}/${current.set.order}/lesson?i=${current.nextItemIndex}`
    : "/learn";

  return (
    <div className="grid gap-6">
      <header className="rise">
        <p className="text-muted">{longDateIst()}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">
          {greetingFor()}, {user.name}
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-6">
        <section className="tile-accent rise p-6 sm:p-8 lg:col-span-4 lg:row-span-2" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="goal-title">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
            <GoalRing percent={percent} />
            <div className="flex-1">
              <h2 id="goal-title" className="text-2xl">
                Today&apos;s goal
              </h2>
              <ul className="mt-4 grid gap-3">
                <ChecklistItem done={itemsToday >= GOAL_ITEMS}>
                  Learn {GOAL_ITEMS} words or phrases ({Math.min(itemsToday, GOAL_ITEMS)}/{GOAL_ITEMS})
                </ChecklistItem>
                <ChecklistItem done={quizDone}>Take the daily quiz</ChecklistItem>
              </ul>
            </div>
          </div>
          <Link href={continueHref} className="btn btn-on-accent btn-block mt-8 sm:w-auto">
            {current ? `Continue Level ${current.level.id}: ${current.level.name}` : "Review any level"}
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </section>

        <Stat label="Day streak" value={streak.current} Icon={Fire} className="lg:col-span-2" delay={2} />
        <Stat label="Points" value={points} Icon={Star} className="lg:col-span-2" delay={3} />

        <section className="card rise relative flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-8 lg:col-span-4" style={{ "--i": 4 } as React.CSSProperties}>
          <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-8 select-none text-[11rem] font-semibold leading-none text-surface-2">
            5
          </span>
          <div className="relative">
            <h2 className="text-2xl">Daily quiz</h2>
            <p className="mt-2 max-w-[40ch] text-muted">
              {quizDone
                ? `Today's score: ${quizScore ?? 0} / 5. You can retake it for practice.`
                : "5 questions, about 2 minutes. Your score counts toward the ranking."}
            </p>
          </div>
          <Link href="/quiz/daily?set=1" className={`btn relative self-start ${quizDone ? "btn-secondary" : "btn-primary"}`}>
            Start quiz
          </Link>
        </section>

        <section className="tile-soft rise flex flex-col justify-between gap-5 p-6 lg:col-span-2" style={{ "--i": 5 } as React.CSSProperties} aria-labelledby="level-title">
          <div>
            <Medal size={22} weight="bold" className="text-accent" aria-hidden="true" />
            <p id="level-title" className="mt-3 text-sm font-semibold text-muted">
              Your level
            </p>
            <p className="text-4xl font-semibold text-ink">{level}</p>
          </div>
          <div>
            <div className="progress" role="progressbar" aria-valuenow={totalAll ? Math.round((learnedAll / totalAll) * 100) : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Items learned overall">
              <i style={{ width: `${totalAll ? (learnedAll / totalAll) * 100 : 0}%` }} />
            </div>
            <p className="mt-2 text-sm text-ink-2">
              {learnedAll} of {totalAll} items learned so far.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, Icon, className = "", delay }: { label: string; value: number; Icon: typeof Fire; className?: string; delay: number }) {
  return (
    <div className={`card rise flex items-center gap-4 p-5 ${className}`} style={{ "--i": delay } as React.CSSProperties}>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
        <Icon size={24} weight="fill" />
      </span>
      <dl>
        <dd className="text-3xl font-semibold leading-none text-ink">{value.toLocaleString("en-IN")}</dd>
        <dt className="mt-1.5 text-sm text-muted">{label}</dt>
      </dl>
    </div>
  );
}

function ChecklistItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full border ${done ? "border-[var(--tile-ink)] bg-[var(--tile-ink)] text-[var(--tile-bg)]" : "border-[var(--tile-ink)]/60"}`}
        aria-hidden="true"
      >
        {done && <Check size={14} weight="bold" />}
      </span>
      <span className={done ? "opacity-75 line-through" : ""}>
        {children}
        <span className="sr-only">{done ? " (done)" : " (not done yet)"}</span>
      </span>
    </li>
  );
}

function GoalRing({ percent }: { percent: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-36 shrink-0 sm:mx-0" role="img" aria-label={`${percent} percent of today's goal done`}>
      <svg viewBox="0 0 108 108" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="54" cy="54" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="9" />
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="ring-draw"
          style={{ "--ring-circ": c } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-3xl font-semibold">{percent}%</div>
    </div>
  );
}
