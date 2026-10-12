// M4 end-to-end: role-play, ranking, admin, reviewer, export.
// DEV DATABASE ONLY: creates accounts, briefly edits seeded content (then restores it through the app) and deletes
// every user whose email ends in @example.com.
// usage: node e2e/m4-roleplay-admin.mjs <baseUrl> <path to mysql.exe> <path to this project folder>
// The server must be running (npm run dev) and the database seeded.
import { execFileSync } from "node:child_process";

const [base, mysql, projectDir] = process.argv.slice(2);
let passed = 0, failed = 0;
const check = (name, ok, extra = "") => { if (ok) passed++; else failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); };
// Read as UTF-8. Never send Japanese text through this command line: Windows would turn it into "?".
const sql = (q) => execFileSync(mysql, ["-u", "root", "--default-character-set=utf8mb4", "kaizen", "-N", "-B", "-e", q], { encoding: "utf8" }).trim();
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "''");

class Client {
  jar = new Map();
  async req(path, { method = "GET", json, form, headers = {} } = {}) {
    const h = { ...headers, cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ") };
    let body;
    if (json) { h["content-type"] = "application/json"; body = JSON.stringify(json); }
    if (form) { h["content-type"] = "application/x-www-form-urlencoded"; body = new URLSearchParams(form).toString(); }
    const res = await fetch(base + path, { method, headers: h, body, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";"); const i = pair.indexOf("=");
      const name = pair.slice(0, i), value = pair.slice(i + 1);
      if (value === "" || /max-age=0/i.test(c)) this.jar.delete(name); else this.jar.set(name, value);
    }
    return res;
  }
  async login(email, password) {
    const csrf = await (await this.req("/api/auth/csrf")).json();
    await this.req("/api/auth/callback/credentials", { method: "POST", form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: base + "/" } });
    return [...this.jar.keys()].some((k) => k.includes("session-token"));
  }
  async api(method, path, json) { const r = await this.req(path, { method, json: method === "GET" ? undefined : json }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
  async text(path) { const r = await this.req(path); return { status: r.status, text: await r.text(), loc: r.headers.get("location") ?? "", type: r.headers.get("content-type") ?? "" }; }
}

const created = [];
async function newUser(tag) {
  const email = `m4.${tag}.${Date.now()}@example.com`;
  const c = new Client();
  await c.req("/api/auth/signup", { method: "POST", json: { email, password: "Kaizen-m4-pass-1" } });
  if (!(await c.login(email, "Kaizen-m4-pass-1"))) throw new Error("login failed");
  await c.req("/api/me", { method: "PATCH", json: { completeOnboarding: true } });
  const id = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
  created.push(id);
  return { c, email, id };
}

const rpIds = sql("SELECT id FROM roleplays ORDER BY `order`").split("\n").map(Number);
const itemIds = sql("SELECT id FROM items ORDER BY id").split("\n").map(Number);
const item1 = sql(`SELECT kana, romaji, english, note, IFNULL(parts,'NULL'), version, reviewStatus FROM items WHERE id=${itemIds[0]}`).split("\t");
const line1 = Number(sql(`SELECT id FROM roleplay_lines ORDER BY id LIMIT 1`));
const lineOrig = sql(`SELECT kana, romaji, english, version, reviewStatus FROM roleplay_lines WHERE id=${line1}`).split("\t");

// ============================================================ role-play
const L = await newUser("learner");
let r = await L.c.text("/roleplay");
check("role-play list renders with the four tiers", r.status === 200 && ["Starter", "Easy", "Medium", "Challenge"].every((t) => r.text.includes(t)));
check("only the first role-play is a link at the start", r.text.includes(`href="/roleplay/${rpIds[0]}"`) && !r.text.includes(`href="/roleplay/${rpIds[1]}"`));
r = await L.c.text(`/roleplay/${rpIds[0]}`);
check("open role-play shows scene and lines", r.status === 200 && r.text.includes("Mark complete") && r.text.includes("Listen to all"));
r = await L.c.text(`/roleplay/${rpIds[1]}`);
check("a locked role-play redirects to the list", r.status === 307 && r.loc.endsWith("/roleplay"));
let x = await L.c.api("POST", `/api/roleplays/${rpIds[1]}/complete`);
check("cannot complete a locked role-play (server enforced)", x.status === 403, x.body.error);
x = await L.c.api("POST", `/api/roleplays/${rpIds[0]}/complete`);
check("first completion earns 30 points and opens the next", x.status === 200 && x.body.firstTime === true && x.body.points === 30 && x.body.nextId === rpIds[1], JSON.stringify(x.body));
x = await L.c.api("POST", `/api/roleplays/${rpIds[0]}/complete`);
check("completing again earns nothing", x.body.firstTime === false && x.body.points === 0);
check("ledger holds one role-play award of 30", sql(`SELECT SUM(delta) FROM points_ledger WHERE userId=${L.id} AND reason='roleplay'`) === "30" && sql(`SELECT COUNT(*) FROM points_ledger WHERE userId=${L.id} AND reason='roleplay'`) === "1");
r = await L.c.text(`/roleplay/${rpIds[1]}`);
check("the next role-play is now open", r.status === 200);
x = await L.c.api("POST", `/api/roleplays/999999/complete`);
check("unknown role-play is 404", x.status === 404);

// ============================================================ ranking
const peer = await newUser("peer");
r = await L.c.text("/ranking");
check("ranking lists learners with points", r.status === 200 && r.text.includes("How points are earned"));
check("ranking never shows an email address", !r.text.includes("@example.com"));
const flat = r.text.replace(/<[^>]+>/g, " ");
check("ranking puts the 30-point learner above the 0-point one", flat.indexOf("M Learner") > -1 && flat.indexOf("M Learner") < flat.indexOf("M Peer"));
const rankText = r.text.replace(/<[^>]+>/g, " ");
check("own row is marked", rankText.includes("You"));

// 22 filler learners with more points, so a 0-point learner falls outside the top 20
for (let i = 0; i < 22; i++) {
  sql(`INSERT INTO users (email, passwordHash, name, role, showRomaji, onboardedAt, status, failedAttempts, sessionVersion, createdAt) VALUES ('filler${i}.${Date.now()}@example.com','x','Filler ${i}','learner',1,NOW(),'active',0,0,NOW())`);
}
const fillerIds = sql("SELECT id FROM users WHERE name LIKE 'Filler %' ORDER BY id").split("\n").map(Number);
created.push(...fillerIds);
fillerIds.forEach((id, i) => sql(`INSERT INTO points_ledger (userId, delta, reason, refKey, localDate) VALUES (${id}, ${1000 + i}, 'set', 'filler:${i}', CURDATE())`));
r = await peer.c.text("/ranking");
const peerText = r.text.replace(/<[^>]+>/g, " ");
const has = (n) => new RegExp(`Filler ${n}(?![0-9])`).test(peerText);
check("the top 20 are shown (Filler 21 down to Filler 2)", has(21) && has(2) && peerText.indexOf("Filler 21") < peerText.indexOf("Filler 20"));
check("a learner outside the top 20 still sees their own row with a position", /\b2[3-9]\b/.test(peerText) && peerText.includes("You") && r.text.includes("..."));
check("rows past the top 20 are not listed", !has(0) && !has(1));

// ============================================================ permissions
const A = await newUser("admin");
const R = await newUser("reviewer");
const anon = new Client();
for (const [m, p] of [["GET", "/api/admin/metrics.csv"], ["PATCH", `/api/admin/users/${L.id}`], ["PATCH", `/api/admin/items/${itemIds[0]}`], ["POST", `/api/items/${itemIds[0]}/verdict`]]) {
  x = await anon.api(m, p, {});
  check(`signed-out ${m} ${p.split("/").slice(0, 4).join("/")} is 401`, x.status === 401);
}
for (const [m, p, body] of [["PATCH", `/api/admin/users/${peer.id}`, { role: "admin" }], ["PATCH", `/api/admin/items/${itemIds[0]}`, { kana: "x", romaji: "x", english: "x", note: "", parts: null }], ["GET", "/api/admin/metrics.csv"], ["POST", `/api/items/${itemIds[0]}/verdict`, { verdict: "approved" }], ["DELETE", `/api/admin/users/${peer.id}`]]) {
  x = await L.c.api(m, p, body);
  check(`learner is refused ${m} ${p.split("/").slice(2, 4).join("/")}`, x.status === 403);
}
r = await L.c.text("/admin");
check("learner is redirected away from /admin", r.status === 307 && !r.loc.includes("/admin"));
r = await L.c.text("/review");
check("learner is redirected away from /review", r.status === 307);

// promote exactly like the make-admin command does
const out = execFileSync("npx", ["tsx", "prisma/make-admin.ts", A.email, "admin"], { cwd: projectDir, encoding: "utf8", shell: true });
check("make-admin promotes an account", out.includes("is now admin"), out.trim());
sql(`UPDATE users SET role='reviewer' WHERE id=${R.id}`);

r = await A.c.text("/admin");
check("admin sees the dashboard (role change took effect with no re-login)", r.status === 200 && r.text.includes("Pilot export") && r.text.includes("Participation counts only"));
r = await R.c.text("/admin");
check("reviewer cannot open the admin dashboard", r.status === 307);
x = await R.c.api("PATCH", `/api/admin/users/${peer.id}`, { role: "admin" });
check("reviewer cannot use admin APIs", x.status === 403);
r = await R.c.text("/review");
check("reviewer opens the review queue", r.status === 200 && r.text.includes("To review"));
for (const p of ["/admin/users", "/admin/content", "/admin/content/level/1", `/admin/content/roleplay/${rpIds[0]}`, "/admin/audit", "/review/roleplays"]) {
  r = await A.c.text(p);
  check(`admin page ${p} renders`, r.status === 200, `status=${r.status}`);
}
r = await A.c.text(`/admin/users?q=${encodeURIComponent(L.email)}`);
check("user search finds by email", r.text.includes(L.email) && !r.text.includes(peer.email));

// ============================================================ user management
x = await A.c.api("PATCH", `/api/admin/users/${A.id}`, { role: "learner" });
check("an admin cannot change their own role", x.status === 403);
x = await A.c.api("PATCH", `/api/admin/users/${peer.id}`, { role: "reviewer" });
check("admin changes a role", x.status === 200 && sql(`SELECT role FROM users WHERE id=${peer.id}`) === "reviewer");
x = await A.c.api("PATCH", `/api/admin/users/${peer.id}`, { status: "deactivated" });
check("admin deactivates a user", x.status === 200);
r = await peer.c.text("/learn");
check("a deactivated user is blocked at once", r.status === 307 && r.loc.includes("/signin"));
x = await A.c.api("PATCH", `/api/admin/users/${peer.id}`, { status: "active" });
check("admin reactivates", x.status === 200);
x = await A.c.api("DELETE", `/api/admin/users/${peer.id}`);
check("admin deletes a user and their data", x.status === 200 && sql(`SELECT COUNT(*) FROM users WHERE id=${peer.id}`) === "0");
x = await A.c.api("DELETE", `/api/admin/users/${A.id}`);
check("an admin cannot delete themselves", x.status === 403);
x = await A.c.api("PATCH", `/api/admin/users/${L.id}`, { role: "nonsense" });
check("invalid role is rejected", x.status === 422);
x = await A.c.api("PATCH", `/api/admin/users/${L.id}`, { role: "learner" }).then(() => A.c.req("/api/admin/users/1", { method: "PATCH", json: { role: "admin" }, headers: { origin: "https://evil.example" } }));
check("cross-site admin write is refused", x.status === 403);

// ============================================================ content manager
const original = { kana: item1[0], romaji: item1[1], english: item1[2], note: item1[3], parts: null };
x = await A.c.api("PATCH", `/api/admin/items/${itemIds[0]}`, { ...original, english: "Yes indeed", parts: null });
check("editing English goes live, bumps the version and sends the item back to Draft", x.status === 200 && x.body.version === Number(item1[5]) + 1 && x.body.reviewStatus === "draft" && x.body.audioNeedsRegeneration === false, JSON.stringify(x.body));
r = await L.c.text("/learn/1/1/lesson?i=0");
check("learners see the edit at once, no redeploy", r.text.includes("Yes indeed"));
x = await A.c.api("PATCH", `/api/admin/items/${itemIds[0]}`, { ...original, english: "Yes indeed", note: "A different note.", parts: null });
check("changing only the note does not bump the version", x.body.version === Number(item1[5]) + 1);
x = await A.c.api("PATCH", `/api/admin/items/${itemIds[0]}`, { ...original, english: "Yes indeed", kana: "はいはい", parts: null });
check("changing the kana flags the audio for regeneration", x.body.audioNeedsRegeneration === true);
x = await A.c.api("PATCH", `/api/admin/items/${itemIds[0]}`, { ...original, parts: "only | two" });
check("a malformed parts line is rejected with a helpful message", x.status === 422 && /Part 1/.test(x.body.error));
x = await A.c.api("PATCH", `/api/admin/items/${itemIds[0]}`, { ...original, kana: "   ", parts: null });
check("empty kana is rejected", x.status === 422);
x = await A.c.api("PATCH", `/api/admin/items/${itemIds[0]}`, { ...original, parts: "あ | a | first\nい | i | second" });
check("valid parts are stored", x.status === 200 && sql(`SELECT parts FROM items WHERE id=${itemIds[0]}`).includes("\"あ\""));

x = await A.c.api("PATCH", "/api/admin/levels/5", { status: "draft" });
r = await L.c.text("/learn");
check("an unpublished level disappears for learners", x.status === 200 && !r.text.includes("Longer sentences"));
await A.c.api("PATCH", "/api/admin/levels/5", { status: "published" });
r = await L.c.text("/learn");
check("publishing brings it back", r.text.includes("Longer sentences"));

const rp3 = sql(`SELECT title FROM roleplays WHERE id=${rpIds[2]}`);
r = await L.c.text("/roleplay");
const before = r.text.includes(rp3);
x = await A.c.api("PATCH", `/api/admin/roleplays/${rpIds[2]}`, { status: "draft" });
r = await L.c.text("/roleplay");
check("an unpublished role-play disappears for learners", before && x.status === 200 && !r.text.includes(rp3), rp3);
await A.c.api("PATCH", `/api/admin/roleplays/${rpIds[2]}`, { status: "published" });
x = await A.c.api("PATCH", `/api/admin/sets/${sql("SELECT id FROM sets ORDER BY id LIMIT 1")}`, { name: "Everyday basics" });
check("set rename works", x.status === 200);

const audits = sql(`SELECT COUNT(*) FROM audit_log WHERE actorId=${A.id}`);
check("admin actions are written to the audit log", Number(audits) >= 8, `rows=${audits}`);
r = await A.c.text("/admin/audit");
check("the audit page lists them", r.text.includes("item.edit") && r.text.includes("user.role") && r.text.includes("user.delete"));

// ============================================================ reviewer workflow
x = await R.c.api("POST", `/api/items/${itemIds[1]}/verdict`, { verdict: "approved" });
check("reviewer approves an item", x.status === 200 && sql(`SELECT reviewStatus FROM items WHERE id=${itemIds[1]}`) === "approved");
x = await R.c.api("POST", `/api/items/${itemIds[2]}/verdict`, { verdict: "wrong" });
check("marking Wrong needs a reason", x.status === 422);
x = await R.c.api("POST", `/api/items/${itemIds[2]}/verdict`, { verdict: "wrong", reason: "Should be the polite form here", target: "text" });
check("reviewer marks an item Wrong with a reason", x.status === 200 && sql(`SELECT reviewStatus FROM items WHERE id=${itemIds[2]}`) === "wrong");
r = await A.c.text("/admin/content/level/1");
check("admin sees the reviewer's reason on the item", r.text.includes("Should be the polite form here"));
r = await A.c.text("/admin");
check("dashboard counts content flagged wrong", /Content flagged wrong/.test(r.text));
r = await R.c.text("/review?status=wrong");
check("reviewer's Wrong filter lists it with the reason", r.text.includes("Should be the polite form here") && r.text.includes("Reason given"));
const wrongItem = sql(`SELECT kana, romaji, english, note FROM items WHERE id=${itemIds[2]}`).split("\t");
x = await A.c.api("PATCH", `/api/admin/items/${itemIds[2]}`, { kana: wrongItem[0], romaji: wrongItem[1], english: wrongItem[2] + " (fixed)", note: wrongItem[3], parts: null });
check("admin fixing a Wrong item republishes it as Draft for re-review", x.body.reviewStatus === "draft");
sql(`UPDATE items SET english='${esc(wrongItem[2])}', version=version-1 WHERE id=${itemIds[2]}`);

x = await R.c.api("POST", `/api/roleplay-lines/${line1}/verdict`, { verdict: "wrong", reason: "Too casual for a first greeting" });
check("reviewer flags a role-play line", x.status === 200 && sql(`SELECT reviewNote FROM roleplay_lines WHERE id=${line1}`) === "Too casual for a first greeting");
r = await A.c.text(`/admin/content/roleplay/${rpIds[0]}`);
check("admin sees the line's reason", r.text.includes("Too casual for a first greeting"));
x = await A.c.api("PATCH", `/api/admin/roleplay-lines/${line1}`, { kana: lineOrig[0], romaji: lineOrig[1], english: lineOrig[2] + "!" });
check("editing a flagged line clears the flag and bumps the version", x.status === 200 && x.body.reviewStatus === "draft" && sql(`SELECT reviewNote IS NULL FROM roleplay_lines WHERE id=${line1}`) === "1");

// ============================================================ export
for (let i = 0; i < 5; i++) await L.c.api("POST", `/api/items/${itemIds[i]}/learned`);
await L.c.api("PATCH", "/api/me", { name: "=HYPERLINK(\"http://evil\",\"x\")" });
let csv = await A.c.req("/api/admin/metrics.csv?type=daily");
let body = await csv.text();
check("daily CSV downloads as text/csv", csv.status === 200 && (csv.headers.get("content-type") ?? "").includes("text/csv") && (csv.headers.get("content-disposition") ?? "").includes("attachment"));
check("daily CSV has the header and a row for the learner's day", body.startsWith("user_id,name,date,items_learned,quiz_done,quiz_score,goal_met,rest_day,points_earned,level_reached,roleplays_completed") && body.split("\r\n").some((l) => l.startsWith(`${L.id},`)));
csv = await A.c.req("/api/admin/metrics.csv?type=summary");
body = await csv.text();
check("summary CSV neutralises a formula typed as a display name", !body.includes(`,=HYPERLINK`) && body.includes(`'=HYPERLINK`));
check("summary CSV has streaks and level dates", body.includes("current_streak,longest_streak,points,level_reached,level1_finished"));
x = await A.c.api("GET", "/api/admin/metrics.csv?type=bogus");
check("unknown export type is rejected", x.status === 422);

// ============================================================ clean up, restore the real content
// Japanese goes back through the admin API (UTF-8 over HTTP). Only numbers and ASCII go through the SQL command line.
await A.c.api("PATCH", `/api/admin/items/${itemIds[0]}`, { ...original, parts: null });
await A.c.api("PATCH", `/api/admin/items/${itemIds[2]}`, { kana: wrongItem[0], romaji: wrongItem[1], english: wrongItem[2], note: wrongItem[3], parts: null });
sql(`UPDATE items SET version=${Number(item1[5])}, reviewStatus='${item1[6]}' WHERE id=${itemIds[0]}`);
sql(`UPDATE items SET version=1, reviewStatus='draft' WHERE id IN (${itemIds[1]}, ${itemIds[2]})`);
await A.c.api("PATCH", `/api/admin/roleplay-lines/${line1}`, { kana: lineOrig[0], romaji: lineOrig[1], english: lineOrig[2] });
sql(`UPDATE roleplay_lines SET version=${lineOrig[3]}, reviewStatus='${lineOrig[4]}', reviewNote=NULL WHERE id=${line1}`);
sql(`DELETE FROM item_reviews WHERE reviewerId IN (${created.join(",")})`);
sql(`DELETE FROM audit_log WHERE actorId IN (${created.join(",")})`);
const after = sql(`SELECT kana, romaji, english, note, version, reviewStatus FROM items WHERE id=${itemIds[0]}`).split("\t");
check("seed item restored exactly after the test", after[0] === item1[0] && after[1] === item1[1] && after[2] === item1[2] && after[3] === item1[3] && after[4] === item1[5] && after[5] === item1[6], after.join(" | "));
const after3 = sql(`SELECT kana, english, version, reviewStatus FROM items WHERE id=${itemIds[2]}`).split("\t");
check("the other edited item is restored too", after3[0] === wrongItem[0] && after3[1] === wrongItem[2] && after3[2] === "1", after3.join(" | "));
const lineAfter = sql(`SELECT kana, english, version, reviewStatus FROM roleplay_lines WHERE id=${line1}`).split("\t");
check("role-play line restored exactly", lineAfter[0] === lineOrig[0] && lineAfter[1] === lineOrig[2] && lineAfter[2] === lineOrig[3] && lineAfter[3] === lineOrig[4], lineAfter.join(" | "));
check("no question marks anywhere in the seeded Japanese", sql("SELECT COUNT(*) FROM items WHERE kana LIKE '%?%'") === "0" && sql("SELECT COUNT(*) FROM roleplay_lines WHERE kana LIKE '%?%'") === "0");
sql("DELETE FROM users WHERE email LIKE '%@example.com'");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
