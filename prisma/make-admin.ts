// Gives an existing account a role. There is no admin screen for the very first admin, so this is how you start.
//   npm run make-admin -- someone@company.com            (admin)
//   npm run make-admin -- someone@company.com reviewer
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariadbConfig } from "../src/lib/db-config";

const [email, role = "admin"] = process.argv.slice(2);
if (!email || !["admin", "reviewer", "learner"].includes(role)) {
  console.error("Usage: npm run make-admin -- <email> [admin|reviewer|learner]");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(mariadbConfig(1)),
});

async function main() {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new Error(`No account with the email ${email}. Create the account in the app first.`);
  await prisma.user.update({ where: { id: user.id }, data: { role: role as "admin" } });
  console.log(`${user.email} is now ${role}.`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
