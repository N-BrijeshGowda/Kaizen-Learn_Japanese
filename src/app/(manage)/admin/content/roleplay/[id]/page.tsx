import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AdminTabs } from "@/components/manage/AdminTabs";
import { FieldsForm, LineEditor, PublishToggle } from "@/components/manage/ContentForms";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/dal";
import { tierOf } from "@/lib/roleplay-core";

export const metadata: Metadata = { title: "Edit role-play" };

export default async function AdminRoleplayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  requireRole(user, "admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const rp = await prisma.roleplay.findUnique({ where: { id }, include: { lines: { orderBy: { order: "asc" } } } });
  if (!rp) notFound();

  return (
    <div>
      <Link href="/admin/content" className="btn btn-quiet -ml-3 mb-2">
        <ArrowLeft size={18} weight="bold" aria-hidden="true" />
        Content
      </Link>
      <header className="mb-6">
        <p className="eyebrow">
          Role-play {rp.order}, {tierOf(rp.order)}
        </p>
        <h1 className="mt-1 text-4xl">{rp.title}</h1>
        <div className="mt-3">
          <PublishToggle url={`/api/admin/roleplays/${rp.id}`} status={rp.status} />
        </div>
      </header>
      <AdminTabs active="content" />

      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold">Details</h2>
        <FieldsForm
          url={`/api/admin/roleplays/${rp.id}`}
          fields={[
            { name: "title", label: "Title", max: 120 },
            { name: "scene", label: "Scene", max: 255 },
          ]}
          values={{ title: rp.title, scene: rp.scene }}
        />
      </section>

      <section className="card overflow-hidden" aria-label="Lines">
        {rp.lines.map((line) => (
          <LineEditor
            key={`${line.id}-${line.version}`}
            id={line.id}
            order={line.order}
            speaker={line.speaker}
            reviewStatus={line.reviewStatus}
            version={line.version}
            note={line.reviewStatus === "wrong" ? line.reviewNote : null}
            initial={{ kana: line.kana, romaji: line.romaji, english: line.english }}
          />
        ))}
      </section>
    </div>
  );
}
