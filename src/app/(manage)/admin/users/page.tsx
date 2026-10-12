import type { Metadata } from "next";
import { AdminTabs } from "@/components/manage/AdminTabs";
import { UsersTable } from "@/components/manage/UsersTable";
import { searchUsers } from "@/lib/admin";
import { requireRole, requireUser } from "@/lib/dal";
import { istDateString } from "@/lib/time";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  requireRole(user, "admin");
  const { q = "" } = await searchParams;
  const users = await searchUsers(q.slice(0, 80));

  return (
    <div>
      <header className="rise mb-6">
        <h1 className="text-4xl sm:text-5xl">Users</h1>
        <p className="mt-1 text-muted">Change roles, deactivate (access blocked, data kept) or delete (all personal data removed).</p>
      </header>
      <AdminTabs active="users" />

      <form method="get" className="mb-4 flex max-w-lg gap-3" role="search">
        <label className="sr-only" htmlFor="q">
          Search by name or email
        </label>
        <input id="q" name="q" defaultValue={q} className="input" placeholder="Search by name or email" maxLength={80} />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>

      <UsersTable
        currentUserId={user.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          joined: istDateString(u.createdAt),
          onboarded: Boolean(u.onboardedAt),
        }))}
      />
      <p className="mt-3 text-xs text-muted">Shows the 100 newest matches.</p>
    </div>
  );
}
