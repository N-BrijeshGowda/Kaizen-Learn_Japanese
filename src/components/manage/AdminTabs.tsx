import Link from "next/link";

const TABS = [
  { key: "dashboard", href: "/admin", label: "Dashboard" },
  { key: "users", href: "/admin/users", label: "Users" },
  { key: "content", href: "/admin/content", label: "Content" },
  { key: "audit", href: "/admin/audit", label: "Audit log" },
] as const;

export function AdminTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Admin sections" className="-mx-5 mb-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex gap-2">
        {TABS.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={active === t.key ? "page" : undefined}
              className="chip"
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ReviewTabs({ active }: { active: "items" | "roleplays" }) {
  return (
    <nav aria-label="Review sections" className="mb-6">
      <ul className="flex gap-2">
        {[
          { key: "items", href: "/review", label: "Words and phrases" },
          { key: "roleplays", href: "/review/roleplays", label: "Role-play lines" },
        ].map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={active === t.key ? "page" : undefined}
              className="chip"
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const STATUS_TAG: Record<string, string> = { draft: "tag-neutral", in_review: "tag-yellow", approved: "tag-green", wrong: "tag-red" };
export const STATUS_LABEL: Record<string, string> = { draft: "Draft", in_review: "In review", approved: "Approved", wrong: "Wrong" };
