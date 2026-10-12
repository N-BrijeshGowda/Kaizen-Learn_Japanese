import { timingSafeEqual } from "node:crypto";
import { fail, json } from "@/lib/api";
import { rolloverAll } from "@/lib/streak";

/**
 * Called by cron once a day, just after midnight IST: settles the day that ended (streaks and rest days)
 * for every learner. Protected by CRON_SECRET, sent as the x-cron-secret header.
 *   5 0 * * *  TZ=Asia/Kolkata  curl -s -X POST -H "x-cron-secret: $CRON_SECRET" https://your-domain/api/internal/rollover
 */
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const given = request.headers.get("x-cron-secret") ?? "";
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return fail("Not allowed.", 403);
  }
  return json(await rolloverAll());
}
