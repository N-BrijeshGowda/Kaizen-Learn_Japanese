import type { Metadata } from "next";
import Link from "next/link";
import { PlayButton } from "@/components/app/PlayButton";
import { ReviewTabs, STATUS_LABEL, STATUS_TAG } from "@/components/manage/AdminTabs";
import { VerdictControls } from "@/components/manage/VerdictControls";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Review role-plays" };

const FILTERS = [
  { key: "todo", label: "To review" },
  { key: "wrong", label: "Marked wrong" },
  { key: "approved", label: "Approved" },
  { key: "all", label: "All" },
] as const;

export default async function ReviewRoleplaysPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  requireRole(user, "reviewer", "admin");
  const { status = "todo" } = await searchParams;
  const filter = FILTERS.some((f) => f.key === status) ? status : "todo";

  const lines = await prisma.roleplayLine.findMany({
    where: filter === "todo" ? { reviewStatus: { in: ["draft", "in_review"] } } : filter === "all" ? {} : { reviewStatus: filter as "wrong" | "approved" },
    orderBy: [{ roleplay: { order: "asc" } }, { order: "asc" }],
    include: { roleplay: { select: { order: true, title: true } } },
    take: 200,
  });

  return (
    <div>
      <header className="rise mb-6">
        <h1 className="text-4xl sm:text-5xl">Review</h1>
        <p className="mt-1 max-w-[62ch] text-muted">Check each role-play line. Wrong lines go back to the admin to fix and republish.</p>
      </header>
      <ReviewTabs active="roleplays" />

      <ul className="mb-5 flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <li key={f.key}>
            <Link href={`/review/roleplays?status=${f.key}`} aria-current={filter === f.key ? "true" : undefined} className="chip">
              {f.label}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mb-3 text-sm text-muted">{lines.length} {lines.length === 1 ? "line" : "lines"}</p>
      <ul className="card divide-y divide-line">
        {lines.map((line) => (
          <li key={line.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="flex min-w-0 items-start gap-3">
              <PlayButton text={line.kana} label={line.english} />
              <div className="min-w-0">
                <p className="jp text-xl text-ink" lang="ja">{line.kana}</p>
                <p className="text-sm text-muted">{line.romaji}</p>
                <p className="text-ink-2">{line.english}</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className={`tag ${STATUS_TAG[line.reviewStatus]}`}>{STATUS_LABEL[line.reviewStatus]}</span>
                  Role-play {line.roleplay.order}: {line.roleplay.title}, line {line.order} ({line.speaker === "you" ? "You" : "Colleague"})
                </p>
                {line.reviewStatus === "wrong" && line.reviewNote && <p className="mt-2 text-sm text-[var(--tag-red-ink)]">Reason given: {line.reviewNote}</p>}
              </div>
            </div>
            <VerdictControls kind="line" id={line.id} />
          </li>
        ))}
        {!lines.length && <li className="px-5 py-10 text-center text-muted">Nothing here. Try another filter.</li>}
      </ul>
    </div>
  );
}
