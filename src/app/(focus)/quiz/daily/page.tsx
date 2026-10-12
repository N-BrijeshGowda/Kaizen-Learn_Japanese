import type { Metadata } from "next";
import { QuizRunner } from "@/components/app/QuizRunner";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Daily quiz" };

export default async function DailyQuizPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const user = await requireUser();
  const { set } = await searchParams;
  const parsed = Number(set);
  const setNo = Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 1;
  // key: "New quiz" changes only the set number, and the runner must start over for the new set.
  return <QuizRunner key={setNo} kind="daily" setNo={setNo} showRomaji={user.showRomaji} backHref="/" backLabel="Today" />;
}
