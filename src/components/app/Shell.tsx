import Link from "next/link";
import { GearSix, SignOut } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "@/components/app/Brand";
import { SideNav, TabBar } from "@/components/app/NavLinks";
import { signOutAction } from "@/app/actions";

const ROLE_LABEL = { learner: "Learner", reviewer: "Reviewer", admin: "Admin" } as const;

export function Shell({ userName, role, wide = false, children }: { userName: string; role: "learner" | "reviewer" | "admin"; wide?: boolean; children: React.ReactNode }) {
  const initial = userName.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="min-[900px]:grid min-[900px]:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 px-5 py-7 min-[900px]:flex">
        <div className="px-2">
          <Brand />
        </div>
        <SideNav role={role} />

        <div className="card mt-auto p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent" aria-hidden="true">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{userName}</div>
              <div className="text-xs text-muted">{ROLE_LABEL[role]}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <Link href="/settings" className="btn btn-quiet !min-h-9 !gap-1.5 !px-3 !text-sm">
              <GearSix size={16} aria-hidden="true" />
              Settings
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-quiet !min-h-9 w-full !gap-1.5 !px-3 !text-sm">
                <SignOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between px-5 pt-4 min-[900px]:hidden">
          <Brand />
          <Link href="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink">
            <GearSix size={20} aria-hidden="true" />
          </Link>
        </header>
        <main className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-5xl"} px-5 pb-28 pt-4 min-[900px]:px-10 min-[900px]:pb-6 min-[900px]:pt-8`}>{children}</main>
        <TabBar />
      </div>
    </div>
  );
}
