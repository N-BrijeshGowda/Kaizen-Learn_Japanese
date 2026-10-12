import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardText, ShieldCheck, SignOut } from "@phosphor-icons/react/dist/ssr";
import { signOutAction } from "@/app/actions";
import { SettingsForm } from "@/components/app/SettingsForm";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="grid max-w-2xl gap-6">
      <header className="rise">
        <h1 className="text-3xl sm:text-4xl">Settings</h1>
        <p className="mt-2 text-lg text-muted">{user.email}</p>
      </header>

      <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
        <SettingsForm initialName={user.name} initialShowRomaji={user.showRomaji} />
      </div>

      <section className="card rise p-6" style={{ "--i": 2 } as React.CSSProperties}>
        <h2 className="text-xl">Your data</h2>
        <p className="mt-1 max-w-[56ch] text-ink-2">
          To get a copy of your progress or have your account deleted, ask the Kaizen admin. Requests are handled within 7 days. Your voice recordings never leave your device, so there is nothing to delete there.
        </p>
      </section>

      {user.role !== "learner" && (
        <section className="card rise p-6" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="manage-title">
          <h2 id="manage-title" className="text-xl">
            Manage
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/review" className="btn btn-secondary">
              <ClipboardText size={18} weight="bold" aria-hidden="true" />
              Review
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="btn btn-secondary">
                <ShieldCheck size={18} weight="bold" aria-hidden="true" />
                Admin
              </Link>
            )}
          </div>
        </section>
      )}

      <form action={signOutAction} className="rise" style={{ "--i": 3 } as React.CSSProperties}>
        <button type="submit" className="btn btn-secondary">
          <SignOut size={18} weight="bold" aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  );
}
