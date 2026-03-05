const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const quests = await prisma.quest.findMany({
            where: {},
            include: {
                assignedTo: {
                    include: {
                        user: { select: { name: true, image: true, email: true } }
                    }
                },
                creator: { select: { name: true, image: true } },
                logs: {
                    include: {
                        employee: {
                            include: { user: { select: { name: true, image: true } } }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        console.log("Success! Found", quests.length);
    } catch (err) {
        console.error("PRISMA ERROR:", err);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
