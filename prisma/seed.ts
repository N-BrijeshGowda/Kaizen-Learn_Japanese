// Loads the draft curriculum (5 levels, 125 items, 24 role-plays) into the database.
// Safe to run again: it only adds rows that are missing and never overwrites edits made in the content manager.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariadbConfig } from "../src/lib/db-config";

type SeedItem = { k: string; ro: string; en: string; note: string; parts: string[][] | null };
type SeedLevel = { id: number; name: string; kind: string; sub: string; sets: { name: string; items: SeedItem[] }[] };
type SeedRoleplay = { t: string; scene: string; lines: { w: string; k: string; ro: string; en: string }[] };

function load<T>(file: string, globalName: string): T {
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.runInNewContext(readFileSync(join(__dirname, "seed-data", file), "utf8"), sandbox);
  return sandbox.window[globalName] as T;
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(mariadbConfig(2)),
});

async function main() {
  const levels = load<SeedLevel[]>("content.js", "KAIZEN_LEVELS");
  const roleplays = load<SeedRoleplay[]>("roleplays.js", "KAIZEN_ROLEPLAYS");

  const itemCount = levels.reduce((n, l) => n + l.sets.reduce((m, s) => m + s.items.length, 0), 0);
  if (levels.length !== 5 || itemCount !== 125) throw new Error(`Expected 5 levels and 125 items, found ${levels.length} and ${itemCount}`);
  if (roleplays.length !== 24) throw new Error(`Expected 24 role-plays, found ${roleplays.length}`);

  let createdItems = 0;
  for (const level of levels) {
    await prisma.level.upsert({
      where: { id: level.id },
      create: { id: level.id, name: level.name, kind: level.kind.toLowerCase() as "word", subtitle: level.sub },
      update: {},
    });
    for (const [setIndex, set] of level.sets.entries()) {
      const dbSet = await prisma.learnSet.upsert({
        where: { levelId_order: { levelId: level.id, order: setIndex + 1 } },
        create: { levelId: level.id, order: setIndex + 1, name: set.name },
        update: {},
      });
      for (const [itemIndex, item] of set.items.entries()) {
        const exists = await prisma.item.findUnique({ where: { setId_order: { setId: dbSet.id, order: itemIndex + 1 } } });
        if (exists) continue;
        await prisma.item.create({
          data: {
            setId: dbSet.id,
            order: itemIndex + 1,
            kana: item.k,
            romaji: item.ro,
            english: item.en,
            note: item.note,
            parts: item.parts ? JSON.stringify(item.parts) : null,
          },
        });
        createdItems += 1;
      }
    }
  }

  let createdLines = 0;
  for (const [index, rp] of roleplays.entries()) {
    const dbRp = await prisma.roleplay.upsert({
      where: { order: index + 1 },
      create: { order: index + 1, title: rp.t, scene: rp.scene },
      update: {},
    });
    for (const [lineIndex, line] of rp.lines.entries()) {
      const exists = await prisma.roleplayLine.findUnique({
        where: { roleplayId_order: { roleplayId: dbRp.id, order: lineIndex + 1 } },
      });
      if (exists) continue;
      await prisma.roleplayLine.create({
        data: {
          roleplayId: dbRp.id,
          order: lineIndex + 1,
          speaker: line.w === "you" ? "you" : "colleague",
          kana: line.k,
          romaji: line.ro,
          english: line.en,
        },
      });
      createdLines += 1;
    }
  }

  console.log(`Seed finished: ${createdItems} new items, ${createdLines} new role-play lines.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
