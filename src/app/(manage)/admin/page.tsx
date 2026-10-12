import type { Metadata } from "next";
import Link from "next/link";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { AdminTabs } from "@/components/manage/AdminTabs";
import { participation } from "@/lib/admin";
import { requireRole, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const user = await requireUser();
  requireRole(user, "admin");
  const { rows, totals } = await participation();

  const stats: { label: string; value: string; href?: string }[] = [
    { label: "Learners", value: String(totals.learners) },
    { label: "Reached a first goal day", value: String(totals.activated) },
    { label: "Active in the last 7 days", value: String(totals.activeLast7Days) },
    { label: "Average daily quiz", value: totals.quizAverage === null ? "None yet" : `${totals.quizAverage.toFixed(1)} / 5` },
    { label: "Role-plays completed", value: String(totals.roleplaysCompleted) },
    { label: "Content flagged wrong", value: String(totals.flaggedWrong), href: "/review?status=wrong" },
  ];

  return (
    <div>
      <header className="rise mb-6">
        <h1 className="text-4xl sm:text-5xl">Admin</h1>
        <p className="mt-1 text-muted">Participation counts only. No recordings and no individual mistakes are shown here.</p>
      </header>
      <AdminTabs active="dashboard" />

      <dl className="rise mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" style={{ "--i": 1 } as React.CSSProperties}>
        {stats.map((s, i) => (
          <div key={s.label} className={i === 0 ? "tile-accent p-5" : "card p-5"}>
            <dd className={`text-3xl font-semibold ${i === 0 ? "" : "text-ink"}`}>{s.href ? <Link href={s.href} className="underline decoration-line-strong underline-offset-4 hover:text-accent">{s.value}</Link> : s.value}</dd>
            <dt className={`mt-1 text-xs font-semibold ${i === 0 ? "opacity-90" : "text-muted"}`}>{s.label}</dt>
          </div>
        ))}
      </dl>

      <section className="card rise mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" style={{ "--i": 2 } as React.CSSProperties}>
        <div>
          <h2 className="text-lg font-semibold">Pilot export</h2>
          <p className="text-sm text-muted">CSV files for the pilot review. Display names are made safe to open in a spreadsheet.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/api/admin/metrics.csv?type=daily" className="btn btn-secondary" download>
            <DownloadSimple size={18} weight="bold" aria-hidden="true" />
            Per learner per day
          </a>
          <a href="/api/admin/metrics.csv?type=summary" className="btn btn-secondary" download>
            <DownloadSimple size={18} weight="bold" aria-hidden="true" />
            Per learner
          </a>
        </div>
      </section>

      <div className="card rise overflow-x-auto" style={{ "--i": 3 } as React.CSSProperties}>
        <table className="w-full min-w-[48rem] text-left text-sm">
          <caption className="sr-only">Participation per learner</caption>
          <thead>
            <tr className="table-head text-xs font-semibold">
              <th scope="col" className="px-5 py-3">Learner</th>
              <th scope="col" className="py-3 text-right">Active days</th>
              <th scope="col" className="py-3 text-right">Streak</th>
              <th scope="col" className="py-3 text-right">Longest</th>
              <th scope="col" className="py-3 text-right">Points</th>
              <th scope="col" className="py-3 text-right">Level</th>
              <th scope="col" className="px-5 py-3 text-right">Quiz average</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3">
                  <p className="font-semibold text-ink">{r.name}</p>
                  <p className="text-muted">{r.email}</p>
                </td>
                <td className="py-3 text-right text-ink-2">{r.activeDays}</td>
                <td className="py-3 text-right text-ink-2">{r.currentStreak}</td>
                <td className="py-3 text-right text-ink-2">{r.longestStreak}</td>
                <td className="py-3 text-right font-semibold text-ink">{r.points.toLocaleString("en-IN")}</td>
                <td className="py-3 text-right text-ink-2">{r.level}</td>
                <td className="px-5 py-3 text-right text-ink-2">{r.quizAverage === null ? "None yet" : `${r.quizAverage.toFixed(1)} / 5`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Streaks are as of the last daily rollover.</p>
    </div>
  );
}
