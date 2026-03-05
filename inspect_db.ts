import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const quests = await prisma.quest.findMany({
      select: { id: true, title: true, initiativeId: true }
  });
  console.log('Quests:', quests);
  const initiatives = await prisma.initiative.findMany({
      select: { id: true, title: true }
  });
  console.log('Initiatives:', initiatives);
}
main().catch(console.error).finally(() => prisma.$disconnect());
