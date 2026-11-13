// Idempotent seed: 3 demo users + sample docs that exercise every sharing state.
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo password is public on purpose (shown on the sign-in page) so reviewers can test sharing.
export const DEMO_PASSWORD = "ajaia-demo";

const users = [
  { id: "alice", name: "Alice Chen", email: "alice@ajaia.dev", isAdmin: true },
  { id: "bob", name: "Bob Rivera", email: "bob@ajaia.dev", isAdmin: false },
  { id: "carol", name: "Carol Okafor", email: "carol@ajaia.dev", isAdmin: false },
];

const docs = [
  {
    id: "seed-q4-plan",
    title: "Q4 launch plan",
    ownerId: "alice",
    content:
      "<p>Goal: ship the <strong>shared workspace beta</strong> to three pilot teams by <u>December 12</u>.</p>" +
      "<h2>Workstreams</h2><ul><li><p>Editor polish — <em>owner: Bob</em></p></li><li><p>Sharing and permissions</p></li><li><p>Pilot onboarding guide</p></li></ul>" +
      "<h2>Open questions</h2><ol><li><p>Do pilots need comments, or is sharing enough?</p></li><li><p>Who signs off on the launch email?</p></li></ol>",
    shares: [{ userId: "bob", role: Role.EDITOR }],
  },
  {
    id: "seed-offsite",
    title: "Team offsite agenda",
    ownerId: "alice",
    content:
      "<p>Two days, one outcome: agree on the <strong>first-half roadmap</strong>.</p>" +
      "<h3>Day one</h3><ul><li><p>Retro on the last quarter</p></li><li><p>Customer interview readout</p></li></ul>" +
      "<h3>Day two</h3><ul><li><p>Roadmap draft, <em>then cut it in half</em></p></li></ul>",
    shares: [],
  },
  {
    id: "seed-onboarding",
    title: "Onboarding checklist",
    ownerId: "carol",
    content:
      "<p>Everything a new teammate needs in their <strong>first week</strong>.</p>" +
      "<ol><li><p>Laptop and accounts</p></li><li><p>Meet your onboarding buddy</p></li><li><p><u>Ship one small change</u></p></li></ol>",
    shares: [{ userId: "alice", role: Role.VIEWER }],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of users) {
    const data = { ...u, passwordHash, status: "ACTIVE" as const };
    await prisma.user.upsert({ where: { id: u.id }, update: data, create: data });
  }
  for (const { shares, ...d } of docs) {
    await prisma.document.upsert({ where: { id: d.id }, update: {}, create: d });
    for (const s of shares) {
      await prisma.documentShare.upsert({
        where: { documentId_userId: { documentId: d.id, userId: s.userId } },
        update: {},
        create: { documentId: d.id, ...s },
      });
    }
  }
  console.log(`Seeded ${users.length} users and ${docs.length} documents.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
