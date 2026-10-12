import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { audit, dailyMetricsCsv, summaryMetricsCsv } from "@/lib/admin";
import { guard } from "@/lib/admin-api";

/** Pilot export. ?type=daily (default) is one row per learner per day; ?type=summary is one row per learner. */
export async function GET(request: Request) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const type = new URL(request.url).searchParams.get("type") ?? "daily";
  if (type !== "daily" && type !== "summary") return fail("Unknown export type.", 422);

  const csv = type === "daily" ? await dailyMetricsCsv() : await summaryMetricsCsv();
  await audit(g.user.id, "export.csv", type);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kaizen-${type}-metrics.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
