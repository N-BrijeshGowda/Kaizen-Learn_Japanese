import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Lesson } from "@/components/app/Lesson";
import { requireUser } from "@/lib/dal";
import { getCurriculum, kindLabel } from "@/lib/curriculum";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string; set: string }>;
  searchParams: Promise<{ i?: string }>;
}) {
  const user = await requireUser();
  const { level: levelParam, set: setParam } = await params;
  const { i } = await searchParams;

  const levelId = Number(levelParam);
  const setOrder = Number(setParam);
  if (!Number.isInteger(levelId) || !Number.isInteger(setOrder)) notFound();

  const levels = await getCurriculum(user.id);
  const level = levels.find((l) => l.id === levelId);
  if (!level) notFound();
  if (!level.unlocked) redirect("/learn");

  const set = level.sets.find((s) => s.order === setOrder);
  if (!set) notFound();
  // Sets open one after another (FR-L6); send the learner back to where they are allowed to be.
  if (!set.open) redirect(`/learn/${level.id}`);

  const requested = Number(i);
  const firstNew = set.items.findIndex((item) => !item.learned);
  const initialIndex =
    Number.isInteger(requested) && requested >= 0 && requested < set.items.length ? requested : Math.max(0, firstNew);

  const nextSet = level.sets.find((s) => s.order === setOrder + 1);

  return (
    <Lesson
      levelId={level.id}
      kindLabel={kindLabel(level.kind)}
      setOrder={set.order}
      setName={set.name}
      nextSetOrder={nextSet ? nextSet.order : null}
      items={set.items}
      initialIndex={initialIndex}
      showRomaji={user.showRomaji}
    />
  );
}
