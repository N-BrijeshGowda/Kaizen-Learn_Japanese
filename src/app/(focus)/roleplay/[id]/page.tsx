import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RoleplayPlayer } from "@/components/app/RoleplayPlayer";
import { requireUser } from "@/lib/dal";
import { getRoleplay } from "@/lib/roleplay";

export const metadata: Metadata = { title: "Role-play" };

export default async function RoleplayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const rp = await getRoleplay(user.id, id);
  if (!rp) notFound();
  if (!rp.row.open) redirect("/roleplay");

  return (
    <RoleplayPlayer
      key={id}
      id={id}
      position={rp.position}
      total={rp.total}
      tier={rp.row.tier}
      title={rp.row.title}
      scene={rp.row.scene}
      lines={rp.lines}
      completed={rp.row.completed}
      nextId={rp.nextId}
      showRomaji={user.showRomaji}
    />
  );
}
