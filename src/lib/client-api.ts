"use client";

/** JSON request helper for the admin and reviewer screens. Never throws: network failures come back as { ok: false }. */
export async function sendJson<T = Record<string, unknown>>(
  method: "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; data: T & { error?: string } }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { error?: string } };
  } catch {
    return { ok: false, data: { error: "We could not reach the server. Check your connection and try again." } as T & { error?: string } };
  }
}
