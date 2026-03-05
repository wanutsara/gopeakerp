import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ini = await prisma.initiative.findFirst();
  if (!ini) {
      console.log('No initiative found');
      return;
  }
  const user = await prisma.user.findFirst();
  console.log('Creating quest for initiative', ini.id, 'with creator', user?.id);
  
  const quest = await prisma.quest.create({
      data: {
          title: 'Test Kanban Quest',
          initiativeId: ini.id,
          status: 'OPEN',
          expReward: 10,
          coinReward: 5,
          orderIndex: 2000,
          creatorId: user!.id
      }
  });
  console.log('Created Quest:', quest);
}
main().catch(console.error).finally(() => prisma.$disconnect());
