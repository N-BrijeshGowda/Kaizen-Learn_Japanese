import type { Metadata } from "next";
import { Fire, Lock, Star, Trophy } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/dal";
import { getCurriculum, kindNoun } from "@/lib/curriculum";
import { totalPoints } from "@/lib/learning";
import { readStreak } from "@/lib/streak";
import { dayStatus, type DayStatus } from "@/lib/streak-core";
import { istDateString } from "@/lib/time";

export const metadata: Metadata = { title: "Progress" };

const STATUS_STYLE: Record<DayStatus, string> = {
  met: "bg-accent text-[var(--accent-ink)] font-semibold",
  rest: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-ink)] font-semibold",
  missed: "bg-[var(--tag-red-bg)] text-[var(--tag-red-ink)]",
  open: "border-2 border-accent text-ink font-semibold",
  future: "text-muted opacity-50",
  before: "text-muted opacity-30",
};
const STATUS_LABEL: Record<DayStatus, string> = {
  met: "goal met",
  rest: "rest day",
  missed: "missed",
  open: "today, still open",
  future: "",
  before: "",
};

export default async function ProgressPage() {
  const user = await requireUser();
  const today = istDateString();
  const [levels, points, streak] = await Promise.all([getCurriculum(user.id), totalPoints(user.id), readStreak(user.id)]);

  const joined = istDateString(user.createdAt);
  const [year, month] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const monthName = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));

  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const ymd = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return { day: i + 1, ymd, status: dayStatus(ymd, today, joined, streak.qualified, streak.restDays) };
  });

  return (
    <div className="grid gap-6">
      <header className="rise">
        <h1 className="text-3xl sm:text-4xl">Progress</h1>
        <p className="mt-2 text-lg text-muted">Your streak, your levels and your month at a glance.</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <section className="card rise p-6 sm:p-8" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="calendar-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="calendar-title" className="text-2xl">
              {monthName}
            </h2>
            <span className={`tag ${streak.restUsedThisWeek ? "tag-neutral" : "tag-blue"}`}>
              {streak.restUsedThisWeek ? "Rest day used this week" : "1 rest day free this week"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-1.5 text-center sm:gap-2" role="grid" aria-label={`Calendar for ${monthName}`}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} role="columnheader" className="pb-1 text-xs font-semibold text-muted">
                {d}
              </div>
            ))}
            {Array.from({ length: leading }, (_, i) => (
              <div key={`gap-${i}`} role="gridcell" aria-hidden="true" />
            ))}
            {cells.map(({ day, ymd, status }) => (
              <div
                key={ymd}
                role="gridcell"
                aria-current={ymd === today ? "date" : undefined}
                className={`grid aspect-square place-items-center rounded-full text-sm ${STATUS_STYLE[status]}`}
              >
                {day}
                {STATUS_LABEL[status] && <span className="sr-only">, {STATUS_LABEL[status]}</span>}
              </div>
            ))}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2" aria-label="Legend">
            <Legend swatch="bg-accent" label="Goal met" />
            <Legend swatch="bg-[var(--tag-blue-bg)] border border-[var(--tag-blue-ink)]" label="Rest day" />
            <Legend swatch="bg-[var(--tag-red-bg)] border border-[var(--tag-red-ink)]" label="Missed" />
            <Legend swatch="border-2 border-accent" label="Today" />
          </ul>
        </section>

        <div className="grid gap-4">
          <div className="tile-accent rise p-6" style={{ "--i": 2 } as React.CSSProperties}>
            <Fire size={26} weight="fill" aria-hidden="true" />
            <p className="mt-4 text-5xl font-semibold leading-none">
              {streak.current}
              <span className="ml-2 text-lg font-medium opacity-80">{streak.current === 1 ? "day" : "days"}</span>
            </p>
            <p className="mt-2 opacity-90">Current streak</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Longest streak" value={streak.longest} unit={streak.longest === 1 ? "day" : "days"} Icon={Trophy} delay={3} />
            <Stat label="Points" value={points} Icon={Star} delay={4} />
          </div>
        </div>
      </div>

      <section className="card rise p-6 sm:p-8" style={{ "--i": 5 } as React.CSSProperties} aria-labelledby="levels-title">
        <h2 id="levels-title" className="text-2xl">
          Levels
        </h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {levels.map((level) => {
            const percent = level.total ? Math.round((level.learned / level.total) * 100) : 0;
            return (
              <li key={level.id}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-ink">
                    Level {level.id}: {level.name}
                  </span>
                  {level.unlocked ? (
                    <span className="text-sm text-muted">{percent}%</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-muted">
                      <Lock size={14} weight="bold" aria-hidden="true" />
                      Locked
                    </span>
                  )}
                </div>
                <div className="progress" role="progressbar" aria-valuenow={level.unlocked ? percent : 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${level.id} progress`}>
                  <i style={{ width: `${level.unlocked ? percent : 0}%` }} />
                </div>
                {level.unlocked && (
                  <p className="mt-1.5 text-xs text-muted">
                    {level.learned} of {level.total} {kindNoun(level.kind)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, unit, Icon, delay }: { label: string; value: number; unit?: string; Icon: typeof Fire; delay: number }) {
  return (
    <div className="card rise p-5" style={{ "--i": delay } as React.CSSProperties}>
      <Icon size={22} weight="fill" className="text-accent" aria-hidden="true" />
      <dl className="mt-3">
        <dd className="text-3xl font-semibold leading-none text-ink">
          {value.toLocaleString("en-IN")}
          {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
        </dd>
        <dt className="mt-1.5 text-sm text-muted">{label}</dt>
      </dl>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`size-4 rounded-full ${swatch}`} aria-hidden="true" />
      {label}
    </li>
  );
}
