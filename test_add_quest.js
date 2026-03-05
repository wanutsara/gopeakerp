const { PrismaClient } = require('@prisma/client');
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
            title: 'Test Kanban Quest from script',
            initiativeId: ini.id,
            status: 'OPEN',
            expReward: 10,
            coinReward: 5,
            orderIndex: 2000,
            creatorId: user.id
        }
    });
    console.log('Created Quest:', quest);

    const fetchedQuests = await prisma.quest.findMany({ where: { initiativeId: ini.id } });
    console.log('Fetched quests for initiative', ini.id, ':', fetchedQuests.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
