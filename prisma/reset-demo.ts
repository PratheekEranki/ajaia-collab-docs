// Restores the demo to a clean slate: only Alice/Bob/Carol and the 3 sample docs, in their original state.
// DESTRUCTIVE: deletes every other user and document. Run: npm run db:reset-demo
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEED_USERS = ["alice", "bob", "carol"];
const SEED_DOCS = ["seed-q4-plan", "seed-offsite", "seed-onboarding"];

async function main() {
  const docs = await prisma.document.deleteMany({ where: { id: { notIn: SEED_DOCS } } });
  const users = await prisma.user.deleteMany({ where: { id: { notIn: SEED_USERS } } });
  await prisma.attachment.deleteMany({});
  await prisma.accessRequest.deleteMany({});
  await prisma.documentShare.deleteMany({});
  // Removing seed docs lets the seed recreate them with original title/content/sharing.
  await prisma.document.deleteMany({ where: { id: { in: SEED_DOCS } } });
  console.log(`Removed ${docs.count} extra documents and ${users.count} extra accounts. Re-seeding…`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
