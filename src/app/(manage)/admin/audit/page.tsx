import type { Metadata } from "next";
import { AdminTabs } from "@/components/manage/AdminTabs";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  const user = await requireUser();
  requireRole(user, "admin");
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(entries.map((e) => e.actorId))] } }, select: { id: true, name: true } });
  const name = new Map(actors.map((a) => [a.id, a.name]));
  const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <header className="rise mb-6">
        <h1 className="text-4xl sm:text-5xl">Audit log</h1>
        <p className="mt-1 text-muted">Role changes, deactivations, deletions, publishing, content edits and exports. Times are IST.</p>
      </header>
      <AdminTabs active="audit" />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">Recent admin actions</caption>
          <thead>
            <tr className="table-head text-xs font-semibold">
              <th scope="col" className="px-5 py-3">When</th>
              <th scope="col" className="py-3">Who</th>
              <th scope="col" className="py-3">Action</th>
              <th scope="col" className="px-5 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3 text-muted">{when.format(e.createdAt)}</td>
                <td className="py-3 text-ink">{name.get(e.actorId) ?? `User ${e.actorId}`}</td>
                <td className="py-3 font-semibold text-ink">{e.action}</td>
                <td className="px-5 py-3 text-ink-2">{e.target}</td>
              </tr>
            ))}
            {!entries.length && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  Nothing has been logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
