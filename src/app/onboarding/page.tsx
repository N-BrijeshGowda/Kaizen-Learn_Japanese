import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/app/OnboardingFlow";
import { getUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/signin");
  if (user.onboardedAt) redirect("/");
  return <OnboardingFlow initialName={user.name} />;
}
