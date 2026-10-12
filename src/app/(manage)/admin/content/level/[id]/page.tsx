import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AdminTabs } from "@/components/manage/AdminTabs";
import { FieldsForm, ItemEditor, PublishToggle } from "@/components/manage/ContentForms";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/dal";
import { partsToText } from "@/lib/content-edit-core";

export const metadata: Metadata = { title: "Edit level" };

export default async function AdminLevelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  requireRole(user, "admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const level = await prisma.level.findUnique({
    where: { id },
    include: { sets: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } } },
  });
  if (!level) notFound();

  // The latest reason a reviewer gave for each item that is currently marked wrong.
  const wrongIds = level.sets.flatMap((s) => s.items).filter((i) => i.reviewStatus === "wrong").map((i) => i.id);
  const reviews = wrongIds.length ? await prisma.itemReview.findMany({ where: { itemId: { in: wrongIds }, verdict: "wrong" }, orderBy: { createdAt: "desc" } }) : [];
  const reasonBy = new Map<number, string>();
  for (const r of reviews) if (!reasonBy.has(r.itemId) && r.reason) reasonBy.set(r.itemId, r.reason);

  return (
    <div>
      <Link href="/admin/content" className="btn btn-quiet -ml-3 mb-2">
        <ArrowLeft size={18} weight="bold" aria-hidden="true" />
        Content
      </Link>
      <header className="mb-6">
        <h1 className="text-4xl">
          Level {level.id}: {level.name}
        </h1>
        <div className="mt-3">
          <PublishToggle url={`/api/admin/levels/${level.id}`} status={level.status} />
        </div>
      </header>
      <AdminTabs active="content" />

      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold">Level details</h2>
        <FieldsForm
          url={`/api/admin/levels/${level.id}`}
          fields={[
            { name: "name", label: "Name", max: 80 },
            { name: "subtitle", label: "Subtitle", max: 200 },
          ]}
          values={{ name: level.name, subtitle: level.subtitle }}
        />
      </section>

      <div className="grid gap-6">
        {level.sets.map((set) => (
          <section key={set.id} className="card overflow-hidden" aria-labelledby={`set-${set.id}`}>
            <div className="border-b border-line p-5">
              <h2 id={`set-${set.id}`} className="mb-3 text-lg font-semibold">
                Set {set.order}
              </h2>
              <FieldsForm url={`/api/admin/sets/${set.id}`} fields={[{ name: "name", label: "Set name", max: 80 }]} values={{ name: set.name }} />
            </div>
            {set.items.map((item) => (
              <ItemEditor
                key={`${item.id}-${item.version}`}
                id={item.id}
                order={item.order}
                reviewStatus={item.reviewStatus}
                version={item.version}
                wrongReason={reasonBy.get(item.id) ?? null}
                initial={{ kana: item.kana, romaji: item.romaji, english: item.english, note: item.note, parts: partsToText(item.parts) }}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
