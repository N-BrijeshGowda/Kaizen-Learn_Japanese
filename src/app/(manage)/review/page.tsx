import type { Metadata } from "next";
import Link from "next/link";
import { PlayButton } from "@/components/app/PlayButton";
import { ReviewTabs, STATUS_LABEL, STATUS_TAG } from "@/components/manage/AdminTabs";
import { VerdictControls } from "@/components/manage/VerdictControls";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Review" };

const FILTERS = [
  { key: "todo", label: "To review" },
  { key: "wrong", label: "Marked wrong" },
  { key: "approved", label: "Approved" },
  { key: "all", label: "All" },
] as const;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ status?: string; level?: string }> }) {
  const user = await requireUser();
  requireRole(user, "reviewer", "admin");
  const { status = "todo", level = "all" } = await searchParams;
  const filter = FILTERS.some((f) => f.key === status) ? status : "todo";
  const levelId = Number(level);
  const levelFilter = Number.isInteger(levelId) && levelId >= 1 && levelId <= 5 ? levelId : null;

  const items = await prisma.item.findMany({
    where: {
      ...(filter === "todo" ? { reviewStatus: { in: ["draft", "in_review"] as ("draft" | "in_review")[] } } : filter === "all" ? {} : { reviewStatus: filter as "wrong" | "approved" }),
      ...(levelFilter ? { set: { levelId: levelFilter } } : {}),
    },
    orderBy: [{ set: { levelId: "asc" } }, { set: { order: "asc" } }, { order: "asc" }],
    include: { set: { select: { levelId: true, order: true, name: true } } },
    take: 200,
  });
  const wrongIds = items.filter((i) => i.reviewStatus === "wrong").map((i) => i.id);
  const reasons = wrongIds.length ? await prisma.itemReview.findMany({ where: { itemId: { in: wrongIds }, verdict: "wrong" }, orderBy: { createdAt: "desc" } }) : [];
  const reasonBy = new Map<number, string>();
  for (const r of reasons) if (!reasonBy.has(r.itemId) && r.reason) reasonBy.set(r.itemId, r.reason);

  const href = (s: string, l: number | null) => `/review?status=${s}${l ? `&level=${l}` : ""}`;

  return (
    <div>
      <header className="rise mb-6">
        <h1 className="text-4xl sm:text-5xl">Review</h1>
        <p className="mt-1 max-w-[62ch] text-muted">Listen, then mark each item Approved or Wrong with a reason. Wrong items go back to the admin to fix and republish. Review never blocks publishing.</p>
      </header>
      <ReviewTabs active="items" />

      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <ul className="flex flex-wrap gap-2" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <li key={f.key}>
              <Link href={href(f.key, levelFilter)} aria-current={filter === f.key ? "true" : undefined} className="chip">
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-2" aria-label="Filter by level">
          {[null, 1, 2, 3, 4, 5].map((l) => (
            <li key={l ?? "all"}>
              <Link href={href(filter, l)} aria-current={levelFilter === l ? "true" : undefined} className="chip">
                {l ? `Level ${l}` : "All levels"}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="mb-3 text-sm text-muted">{items.length} {items.length === 1 ? "item" : "items"}</p>
      <ul className="card divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="flex min-w-0 items-start gap-3">
              <PlayButton text={item.kana} label={item.english} />
              <div className="min-w-0">
                <p className="jp text-xl text-ink" lang="ja">{item.kana}</p>
                <p className="text-sm text-muted">{item.romaji}</p>
                <p className="text-ink-2">{item.english}</p>
                {item.note && <p className="mt-1 text-sm text-muted">{item.note}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className={`tag ${STATUS_TAG[item.reviewStatus]}`}>{STATUS_LABEL[item.reviewStatus]}</span>
                  Level {item.set.levelId}, set {item.set.order}: {item.set.name}
                </p>
                {reasonBy.get(item.id) && <p className="mt-2 text-sm text-[var(--tag-red-ink)]">Reason given: {reasonBy.get(item.id)}</p>}
              </div>
            </div>
            <VerdictControls kind="item" id={item.id} />
          </li>
        ))}
        {!items.length && <li className="px-5 py-10 text-center text-muted">Nothing here. Try another filter.</li>}
      </ul>
      {items.length === 200 && <p className="mt-3 text-xs text-muted">Showing the first 200. Narrow it with a level filter.</p>}
    </div>
  );
}
