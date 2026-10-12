import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";
import { getUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getUser()) redirect("/");
  return (
    <AuthShell>
      <SignInForm />
    </AuthShell>
  );
}
