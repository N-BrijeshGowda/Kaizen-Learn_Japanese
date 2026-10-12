import type { Metadata } from "next";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { AdminTabs } from "@/components/manage/AdminTabs";
import { PublishToggle } from "@/components/manage/ContentForms";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/dal";
import { tierOf } from "@/lib/roleplay-core";

export const metadata: Metadata = { title: "Content" };

export default async function AdminContentPage() {
  const user = await requireUser();
  requireRole(user, "admin");

  const [levels, roleplays, wrongLines] = await Promise.all([
    prisma.level.findMany({ orderBy: { id: "asc" }, include: { sets: { include: { items: { select: { reviewStatus: true } } } } } }),
    prisma.roleplay.findMany({ orderBy: { order: "asc" }, include: { lines: { select: { reviewStatus: true } } } }),
    prisma.roleplayLine.groupBy({ by: ["roleplayId"], where: { reviewStatus: "wrong" }, _count: { _all: true } }),
  ]);
  const wrongLinesBy = new Map(wrongLines.map((w) => [w.roleplayId, w._count._all]));

  return (
    <div>
      <header className="rise mb-6">
        <h1 className="text-4xl sm:text-5xl">Content</h1>
        <p className="mt-1 text-muted">Edits go live straight away, with no redeploy. Only published levels and role-plays reach learners.</p>
      </header>
      <AdminTabs active="content" />

      <section className="mb-8" aria-labelledby="levels-h">
        <h2 id="levels-h" className="mb-3 text-xl font-semibold">
          Levels
        </h2>
        <ul className="card divide-y divide-line">
          {levels.map((level) => {
            const items = level.sets.flatMap((s) => s.items);
            const wrong = items.filter((i) => i.reviewStatus === "wrong").length;
            const approved = items.filter((i) => i.reviewStatus === "approved").length;
            return (
              <li key={level.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/content/level/${level.id}`} className="inline-flex items-center gap-2 font-semibold text-ink hover:text-accent">
                    Level {level.id}: {level.name}
                    <CaretRight size={16} weight="bold" aria-hidden="true" />
                  </Link>
                  <p className="text-sm text-muted">
                    {items.length} items, {approved} approved{wrong ? `, ${wrong} flagged wrong` : ""}
                  </p>
                </div>
                <PublishToggle url={`/api/admin/levels/${level.id}`} status={level.status} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="rp-h">
        <h2 id="rp-h" className="mb-3 text-xl font-semibold">
          Role-plays
        </h2>
        <ul className="card divide-y divide-line">
          {roleplays.map((rp) => {
            const wrong = wrongLinesBy.get(rp.id) ?? 0;
            return (
              <li key={rp.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/content/roleplay/${rp.id}`} className="inline-flex items-center gap-2 font-semibold text-ink hover:text-accent">
                    {rp.order}. {rp.title}
                    <CaretRight size={16} weight="bold" aria-hidden="true" />
                  </Link>
                  <p className="text-sm text-muted">
                    {tierOf(rp.order)}, {rp.lines.length} lines{wrong ? `, ${wrong} flagged wrong` : ""}
                  </p>
                </div>
                <PublishToggle url={`/api/admin/roleplays/${rp.id}`} status={rp.status} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
