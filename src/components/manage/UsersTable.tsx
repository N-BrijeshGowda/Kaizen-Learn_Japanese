"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client-api";

type UserRow = { id: number; name: string; email: string; role: "learner" | "reviewer" | "admin"; status: "active" | "deactivated"; joined: string; onboarded: boolean };

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: number }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function change(user: UserRow, body: { role?: string; status?: string }, done: string) {
    setBusyId(user.id);
    setMessage(null);
    const { ok, data } = await sendJson("PATCH", `/api/admin/users/${user.id}`, body);
    setBusyId(null);
    if (!ok) return setMessage({ kind: "error", text: data.error ?? "Could not save that change." });
    setMessage({ kind: "ok", text: `${user.name}: ${done}` });
    router.refresh();
  }

  async function remove(user: UserRow) {
    if (!window.confirm(`Delete ${user.name} (${user.email}) and all their progress? This cannot be undone.`)) return;
    setBusyId(user.id);
    setMessage(null);
    const { ok, data } = await sendJson("DELETE", `/api/admin/users/${user.id}`);
    setBusyId(null);
    if (!ok) return setMessage({ kind: "error", text: data.error ?? "Could not delete that user." });
    setMessage({ kind: "ok", text: `${user.name} was deleted.` });
    router.refresh();
  }

  return (
    <div>
      {message && (
        <div className={`notice ${message.kind === "ok" ? "notice-ok" : "notice-error"}`} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">Users</caption>
          <thead>
            <tr className="table-head text-xs font-semibold">
              <th scope="col" className="px-5 py-3">
                User
              </th>
              <th scope="col" className="py-3">
                Role
              </th>
              <th scope="col" className="py-3">
                Status
              </th>
              <th scope="col" className="py-3">
                Joined
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === currentUserId;
              const busy = busyId === u.id;
              return (
                <tr key={u.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">
                      {u.name}
                      {self && <span className="ml-2 text-xs font-semibold text-accent">You</span>}
                    </p>
                    <p className="text-muted">{u.email}</p>
                  </td>
                  <td className="py-3">
                    <label className="sr-only" htmlFor={`role-${u.id}`}>
                      Role for {u.name}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      className="input !min-h-9 !w-auto !py-0"
                      value={u.role}
                      disabled={self || busy}
                      onChange={(e) => change(u, { role: e.target.value }, `now ${e.target.value}`)}
                    >
                      <option value="learner">Learner</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <span className={`tag ${u.status === "active" ? "tag-green" : "tag-red"}`}>{u.status === "active" ? "Active" : "Deactivated"}</span>
                  </td>
                  <td className="py-3 text-muted">{u.joined}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary !min-h-9 !px-3"
                        disabled={self || busy}
                        onClick={() => change(u, { status: u.status === "active" ? "deactivated" : "active" }, u.status === "active" ? "deactivated" : "reactivated")}
                      >
                        {u.status === "active" ? "Deactivate" : "Reactivate"}
                      </button>
                      <button type="button" className="btn btn-quiet !min-h-9 !px-3 text-[var(--tag-red-ink)]" disabled={self || busy} onClick={() => remove(u)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!users.length && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  No users match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
