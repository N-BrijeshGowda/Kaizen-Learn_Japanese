"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartBar, ChatsCircle, ClipboardText, House, ShieldCheck, Trophy } from "@phosphor-icons/react";

const LINKS = [
  { href: "/", label: "Today", Icon: House },
  { href: "/learn", label: "Learn", Icon: BookOpen },
  { href: "/roleplay", label: "Role-play", Icon: ChatsCircle },
  { href: "/progress", label: "Progress", Icon: ChartBar },
  { href: "/ranking", label: "Ranking", Icon: Trophy },
] as const;

const MANAGE = [
  { href: "/review", label: "Review", Icon: ClipboardText, roles: ["reviewer", "admin"] },
  { href: "/admin", label: "Admin", Icon: ShieldCheck, roles: ["admin"] },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
}

/** Sidebar links, shown from 900px up. Reviewers and admins get a second group for their own screens. */
export function SideNav({ role }: { role: "learner" | "reviewer" | "admin" }) {
  const isActive = useActive();
  const manage = MANAGE.filter((m) => (m.roles as readonly string[]).includes(role));

  const renderLink = ({ href, label, Icon }: { href: string; label: string; Icon: typeof House }) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] font-semibold transition-colors ${
          active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
        }`}
      >
        <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" />
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Main" className="grid gap-1">
        {LINKS.map(renderLink)}
      </nav>
      {manage.length > 0 && (
        <nav aria-label="Manage" className="grid gap-1 border-t border-line pt-4">
          {manage.map(renderLink)}
        </nav>
      )}
    </>
  );
}

/** Floating pill tab bar on phones. The current tab is filled with the accent tint. */
export function TabBar() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[var(--z-nav)] flex justify-between rounded-full border border-line bg-surface p-1.5 shadow-[0_18px_40px_-18px_rgb(var(--shadow-tint)/0.45)] min-[900px]:hidden"
    >
      {LINKS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[0.6875rem] font-semibold transition-colors ${
              active ? "bg-accent-soft text-accent" : "text-muted"
            }`}
          >
            <Icon size={21} weight={active ? "fill" : "regular"} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
