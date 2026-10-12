import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuizRunner } from "@/components/app/QuizRunner";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Level quiz" };

export default async function LevelQuizPage({ params }: { params: Promise<{ level: string }> }) {
  const user = await requireUser();
  const level = Number((await params).level);
  if (!Number.isInteger(level) || level < 1 || level > 5) notFound();

  const open = await prisma.userLevel.findUnique({ where: { userId_levelId: { userId: user.id, levelId: level } } });
  if (!open) redirect("/learn");

  return <QuizRunner kind="level" level={level} showRomaji={user.showRomaji} backHref={`/learn/${level}`} backLabel={`Level ${level}`} />;
}
