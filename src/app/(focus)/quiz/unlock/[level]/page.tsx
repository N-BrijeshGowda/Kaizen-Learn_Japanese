import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuizRunner } from "@/components/app/QuizRunner";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Unlock a level" };

export default async function UnlockQuizPage({ params }: { params: Promise<{ level: string }> }) {
  const user = await requireUser();
  const level = Number((await params).level);
  if (!Number.isInteger(level) || level < 2 || level > 5) notFound();

  const open = await prisma.userLevel.findUnique({ where: { userId_levelId: { userId: user.id, levelId: level } } });
  if (open) redirect(`/learn/${level}`);

  return <QuizRunner kind="unlock" level={level} showRomaji={user.showRomaji} backHref="/learn" backLabel="Learn" />;
}
