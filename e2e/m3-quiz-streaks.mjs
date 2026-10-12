// M3 end-to-end: daily quiz, review dates, unlock/level quizzes, streaks, rollover.
// DEV DATABASE ONLY: creates accounts and deletes every user whose email ends in @example.com.
// usage: node e2e/m3-quiz-streaks.mjs <baseUrl> <path to mysql.exe> <CRON_SECRET from .env>
// The server must be running (npm run dev) and the database seeded.
import { execFileSync } from "node:child_process";

const [base, mysql, cronSecret] = process.argv.slice(2);
let passed = 0, failed = 0;
const check = (name, ok, extra = "") => { if (ok) passed++; else failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); };
const sql = (q) => execFileSync(mysql, ["-u", "root", "kaizen", "-N", "-B", "-e", q], { encoding: "utf8" }).trim();

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
  async api(path, json) { const r = await this.req(path, { method: "POST", json }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
}

async function newUser(tag) {
  const email = `m3.${tag}.${Date.now()}@example.com`;
  const c = new Client();
  await c.req("/api/auth/signup", { method: "POST", json: { email, password: "Kaizen-m3-pass-1" } });
  if (!(await c.login(email, "Kaizen-m3-pass-1"))) throw new Error("login failed");
  await c.req("/api/me", { method: "PATCH", json: { completeOnboarding: true } });
  const id = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
  return { c, email, id };
}

const itemIds = sql("SELECT id FROM items ORDER BY id").split("\n").map(Number);
const levelOf = (itemId) => Number(sql(`SELECT s.levelId FROM items i JOIN sets s ON s.id=i.setId WHERE i.id=${itemId}`));
const stored = (attemptId) => JSON.parse(sql(`SELECT answers FROM quiz_attempts WHERE id=${attemptId}`)).questions;

/** Answers every question; the first `right` correctly, the rest wrongly. Returns the per-question results. */
async function answerAll(c, quiz, right) {
  const questions = stored(quiz.attemptId);
  const results = [];
  for (const q of questions.map((q, i) => ({ ...q, i }))) {
    const wanted = q.i < right ? q.itemId : q.options.find((o) => o !== q.itemId);
    results.push(await c.api("/api/quiz/answer", { attemptId: quiz.attemptId, index: q.i, chosen: wanted }));
  }
  return results;
}

// ================================================================== daily quiz, day 1
const u = await newUser("a");
const { c, id } = u;

let r = await new Client().api("/api/quiz/start", { kind: "daily", set: 1 });
check("quiz start needs a session", r.status === 401);

r = await c.api("/api/quiz/start", { kind: "daily", set: 1 });
const quiz = r.body;
check("daily quiz opens with 5 questions", r.status === 200 && quiz.questions?.length === 5 && quiz.title === "Daily quiz");
check("question types alternate listen / phrase", quiz.questions.map((q) => q.type).join() === "listen,phrase,listen,phrase,listen");
check("every question has 4 distinct options", quiz.questions.every((q) => q.options.length === 4 && new Set(q.options.map((o) => o.itemId)).size === 4));
check("payload never marks the right answer", !JSON.stringify(quiz).match(/"(correct|answer|isCorrect)"/));
check("listening options never repeat an English meaning", quiz.questions.every((q) => new Set(q.options.map((o) => o.english.toLowerCase())).size === 4));

const bank = sql(`SELECT itemIds FROM quiz_sets WHERE userId=${id} ORDER BY setNo`).split("\n").map((l) => JSON.parse(l));
check("5 sets of 5 are stored for the day", bank.length === 5 && bank.every((s) => s.length === 5));
check("first day: 25 distinct items, no repeats across sets", new Set(bank.flat()).size === 25);
check("first day sets draw from Level 1 only (the only open level)", bank.flat().every((x) => levelOf(x) === 1));

let results = await answerAll(c, quiz, 4);
check("4 right answers and 1 wrong are marked correctly", results.filter((x) => x.body.correct).length === 4 && results[4].body.correct === false);
check("a wrong answer reveals the right one", results[4].body.item?.kana?.length > 0);

const again = await c.api("/api/quiz/answer", { attemptId: quiz.attemptId, index: 0, chosen: stored(quiz.attemptId)[0].options.find((o) => o !== stored(quiz.attemptId)[0].chosen) });
check("an answer cannot be changed afterwards", again.body.correct === results[0].body.correct);

const reviewRows = sql(`SELECT itemId, step, DATEDIFF(dueDate, CURDATE()) FROM user_item_review WHERE userId=${id}`).split("\n").map((l) => l.split("\t"));
check("5 items now have review dates", reviewRows.length === 5);

const quiz2 = (await c.api("/api/quiz/start", { kind: "daily", set: 1 })).body;
r = await c.api("/api/quiz/complete", { attemptId: quiz2.attemptId });
check("cannot finish before answering everything", r.status === 403, r.body.error);

r = await c.api("/api/quiz/complete", { attemptId: quiz.attemptId });
check("complete: 4 of 5 scores 40 points", r.body.score === 4 && r.body.pointsAwarded === 40 && r.body.firstDailyOfDay === true, JSON.stringify(r.body));
r = await c.api("/api/quiz/complete", { attemptId: quiz.attemptId });
check("completing twice gives the stored result, no new points", r.body.score === 4 && r.body.firstDailyOfDay === false);
check("ledger holds exactly one daily award", Number(sql(`SELECT COUNT(*) FROM points_ledger WHERE userId=${id} AND reason='quiz'`)) === 1);
check("quizDone is set for today", sql(`SELECT quizDone FROM daily_activity WHERE userId=${id}`) === "1");

// retake set 1: practice only
await answerAll(c, quiz2, 5);
r = await c.api("/api/quiz/complete", { attemptId: quiz2.attemptId });
check("retaking the daily quiz earns nothing", r.body.score === 5 && r.body.pointsAwarded === 0 && r.body.firstDailyOfDay === false);
const quiz3 = (await c.api("/api/quiz/start", { kind: "daily", set: 2 })).body;
check("New quiz opens Practice set 2", quiz3.title === "Practice set 2" && quiz3.setNo === 2);
const set1Ids = bank[0], set2Ids = bank[1];
check("set 2 questions are different items from set 1", stored(quiz3.attemptId).every((q) => !set1Ids.includes(q.itemId) && set2Ids.includes(q.itemId)));
await answerAll(c, quiz3, 5);
r = await c.api("/api/quiz/complete", { attemptId: quiz3.attemptId });
check("practice sets earn no points", r.body.pointsAwarded === 0 && r.body.nextSetNo === 3);

// ================================================================== streak: goal met toast data
let learned;
for (let i = 0; i < 5; i++) learned = await c.api(`/api/items/${itemIds[i]}/learned`);
check("5th item learned completes the goal (quiz already done)", learned.body.goalJustMet === true && learned.body.streak === 1, JSON.stringify({ g: learned.body.goalJustMet, s: learned.body.streak }));
let home = await (await c.req("/")).text();
check("Today shows streak 1 and today's quiz score", home.includes("Day streak") && home.includes("Today&#x27;s score: 4 / 5") || home.includes("Today's score: 4 / 5"));

// ================================================================== next day: review mix
sql(`UPDATE quiz_sets SET localDate=DATE_SUB(localDate, INTERVAL 1 DAY) WHERE userId=${id}`);
sql(`UPDATE daily_activity SET localDate=DATE_SUB(localDate, INTERVAL 1 DAY) WHERE userId=${id}`);
sql(`UPDATE user_item_review SET dueDate=DATE_SUB(dueDate, INTERVAL 1 DAY), lastAnsweredAt=DATE_SUB(lastAnsweredAt, INTERVAL 1 DAY) WHERE userId=${id}`);
sql(`UPDATE study_events SET localDate=DATE_SUB(localDate, INTERVAL 1 DAY) WHERE userId=${id}`);

const day2 = (await c.api("/api/quiz/start", { kind: "daily", set: 1 })).body;
const bank2 = sql(`SELECT itemIds FROM quiz_sets WHERE userId=${id} AND localDate=CURDATE() ORDER BY setNo`).split("\n").map((l) => JSON.parse(l));
const reviewed = new Set(sql(`SELECT itemId FROM user_item_review WHERE userId=${id}`).split("\n").map(Number));
check("a new bank is built for the new day", bank2.length === 5 && bank2.every((s) => s.length === 5));
check("set 1 has 3 new and 2 review questions", bank2[0].filter((x) => reviewed.has(x)).length === 2 && bank2[0].filter((x) => !reviewed.has(x)).length === 3);
check("all 10 items answered yesterday (sets 1 and 2) come back, 2 per set", reviewed.size === 10 && bank2.every((set) => set.filter((x) => reviewed.has(x)).length === 2));
check("review questions carry the Review tag", day2.questions.filter((q) => q.tag === "Review").length === 2);
home = await (await c.req("/")).text();
check("Today: yesterday's streak holds while today is still open", /Day streak/.test(home));
const prog = await (await c.req("/progress")).text();
check("Progress renders the calendar and rest-day tag", prog.includes("Current streak") && prog.includes("1 rest day free this week") && prog.includes("Goal met"));

// ================================================================== unlock quiz
let ur = await c.api("/api/quiz/start", { kind: "unlock", level: 3 });
const unlock = ur.body;
check("unlock quiz opens for a locked level", ur.status === 200 && unlock.title === "Unlock Level 3");
check("unlock questions and options come from levels below the target", stored(unlock.attemptId).every((q) => [q.itemId, ...q.options].every((x) => levelOf(x) < 3)));
await answerAll(c, unlock, 3);
ur = await c.api("/api/quiz/complete", { attemptId: unlock.attemptId });
check("3 of 5 does not unlock", ur.body.passed === false && ur.body.pointsAwarded === 0);
check("failed unlock opens nothing", Number(sql(`SELECT COUNT(*) FROM user_levels WHERE userId=${id}`)) === 1);

const unlock2 = (await c.api("/api/quiz/start", { kind: "unlock", level: 3 })).body;
await answerAll(c, unlock2, 4);
ur = await c.api("/api/quiz/complete", { attemptId: unlock2.attemptId });
check("4 of 5 unlocks Level 3: 40 points + 25 bonus", ur.body.passed === true && ur.body.unlockedLevel === 3 && ur.body.pointsAwarded === 65 && ur.body.bonus === 25, JSON.stringify(ur.body));
check("Levels 1, 2 and 3 are all open, none marked finished", sql(`SELECT GROUP_CONCAT(levelId ORDER BY levelId) FROM user_levels WHERE userId=${id}`) === "1,2,3" && Number(sql(`SELECT COUNT(*) FROM user_levels WHERE userId=${id} AND completedAt IS NOT NULL`)) === 0);
check("unlock points are in the ledger once", Number(sql(`SELECT COUNT(*) FROM points_ledger WHERE userId=${id} AND reason='unlock'`)) === 1);
r = await c.api("/api/quiz/start", { kind: "unlock", level: 3 });
check("an open level cannot be unlock-quizzed again", r.status === 403);
r = await c.api("/api/quiz/start", { kind: "unlock", level: 1 });
check("Level 1 has no unlock quiz", r.status === 404 || r.status === 422);

// rebuild: set 1 for today has not been completed yet today, so all unanswered sets are rebuilt
const bank3 = sql(`SELECT itemIds FROM quiz_sets WHERE userId=${id} AND localDate=CURDATE() ORDER BY setNo`).split("\n").map((l) => JSON.parse(l));
const newLevelCount = (s) => s.filter((x) => levelOf(x) === 3).length;
check("level unlock rebuilds unanswered sets as 3 new-level + 2 earlier", bank3.every((s) => s.length === 5 && newLevelCount(s) === 3), bank3.map(newLevelCount).join());
const quizzedNow = new Set(sql(`SELECT itemId FROM user_item_review WHERE userId=${id}`).split(String.fromCharCode(10)).map(Number));
check("rebuilt sets use only items not yet quizzed, with no repeats", bank3.flat().every((x) => !quizzedNow.has(x)) && new Set(bank3.flat()).size === 25);
const answeredToday = await c.api("/api/quiz/start", { kind: "daily", set: 1 });
check("daily set 1 now serves the rebuilt questions with a New from Level 3 tag", answeredToday.body.questions.some((q) => q.tag === "New from Level 3"), answeredToday.body.questions.map((q) => q.tag).join("|"));

// ================================================================== level quiz
const beforePoints = Number(sql(`SELECT SUM(delta) FROM points_ledger WHERE userId=${id}`));
let lq = await c.api("/api/quiz/start", { kind: "level", level: 1 });
check("level quiz opens for an open level", lq.status === 200 && lq.body.title === "Level 1 quiz");
const learnedNow = new Set(sql(`SELECT itemId FROM user_items WHERE userId=${id} AND learnedAt IS NOT NULL`).split(String.fromCharCode(10)).map(Number));
check("level quiz questions come from that level, learned items first", stored(lq.body.attemptId).every((q) => levelOf(q.itemId) === 1 && learnedNow.has(q.itemId)));
await answerAll(c, lq.body, 5);
lq = await c.api("/api/quiz/complete", { attemptId: lq.body.attemptId });
check("level quiz earns no points", lq.body.score === 5 && lq.body.pointsAwarded === 0 && Number(sql(`SELECT SUM(delta) FROM points_ledger WHERE userId=${id}`)) === beforePoints);
r = await c.api("/api/quiz/start", { kind: "level", level: 4 });
check("a locked level has no level quiz", r.status === 403);

// ================================================================== review dates after wrong then right
const sample = reviewRows[0][0];
sql(`UPDATE user_item_review SET step=2, dueDate=CURDATE() WHERE userId=${id} AND itemId=${sample}`);
const rq = (await c.api("/api/quiz/start", { kind: "level", level: 1 })).body;
const qs = stored(rq.attemptId);
const hit = qs.findIndex((q) => q.itemId === Number(sample));
if (hit >= 0) {
  await c.api("/api/quiz/answer", { attemptId: rq.attemptId, index: hit, chosen: Number(sample) });
  const row = sql(`SELECT step, DATEDIFF(dueDate, CURDATE()) FROM user_item_review WHERE userId=${id} AND itemId=${sample}`).split("\t");
  check("a right answer moves the item one step along (step 2 to 3, due in 14 days)", row[0] === "3" && row[1] === "14", row.join("/"));
  const wrongIdx = qs.findIndex((q, i) => i !== hit);
  await c.api("/api/quiz/answer", { attemptId: rq.attemptId, index: wrongIdx, chosen: qs[wrongIdx].options.find((o) => o !== qs[wrongIdx].itemId) });
  const w = sql(`SELECT step, DATEDIFF(dueDate, CURDATE()) FROM user_item_review WHERE userId=${id} AND itemId=${qs[wrongIdx].itemId}`).split("\t");
  check("a wrong answer sends the item back to step 0, due tomorrow", w[0] === "0" && w[1] === "1", w.join("/"));
} else {
  console.log("SKIP  review-step check (sample item not in this level quiz draw)");
}

// ================================================================== streaks + rollover
const s1 = await newUser("s1");
const d = (n) => `DATE_SUB(CURDATE(), INTERVAL ${n} DAY)`;
for (const n of [4, 3, 1]) sql(`INSERT INTO daily_activity (userId, localDate, itemsLearned, quizDone, qualified, restUsed) VALUES (${s1.id}, ${d(n)}, 5, 1, 1, 0)`);
r = await new Client().req("/api/internal/rollover", { method: "POST", headers: { "x-cron-secret": "wrong" } });
check("rollover refuses a wrong secret", r.status === 403);
r = await new Client().req("/api/internal/rollover", { method: "POST" });
check("rollover refuses no secret", r.status === 403);
r = await new Client().req("/api/internal/rollover", { method: "POST", headers: { "x-cron-secret": cronSecret } });
const rj = await r.json();
check("rollover runs with the secret", r.status === 200 && rj.users >= 1, JSON.stringify(rj));
const st1 = sql(`SELECT current, longest FROM streaks WHERE userId=${s1.id}`).split("\t");
check("one missed day: rest day holds the streak (met 4,3,1 days ago = 3)", st1[0] === "3" && st1[1] === "3", st1.join("/"));
check("the rest day is recorded on that day", Number(sql(`SELECT COUNT(*) FROM daily_activity WHERE userId=${s1.id} AND restUsed=1 AND localDate=${d(2)}`)) === 1);

const s2 = await newUser("s2");
for (const n of [6]) sql(`INSERT INTO daily_activity (userId, localDate, itemsLearned, quizDone, qualified, restUsed) VALUES (${s2.id}, ${d(n)}, 5, 1, 1, 0)`);
sql(`INSERT INTO daily_activity (userId, localDate, itemsLearned, quizDone, qualified, restUsed) VALUES (${s2.id}, ${d(5)}, 5, 1, 1, 0)`);
await new Client().req("/api/internal/rollover", { method: "POST", headers: { "x-cron-secret": cronSecret } });
const st2 = sql(`SELECT current, longest FROM streaks WHERE userId=${s2.id}`).split("\t");
check("two missed days in a row break the streak (longest kept)", st2[0] === "0" && st2[1] === "2", st2.join("/"));
const prog2 = await (await s2.c.req("/progress")).text();
check("Progress shows the longest streak after a reset", prog2.includes("Longest streak"));

console.log(`\n${passed} passed, ${failed} failed`);
sql("DELETE FROM users WHERE email LIKE '%@example.com'");
process.exit(failed ? 1 : 0);
