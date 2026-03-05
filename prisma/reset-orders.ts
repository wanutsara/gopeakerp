import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Resetting CDP/OMS/Finance Sandbox Data...');
    await prisma.transaction.deleteMany({ where: { description: { startsWith: 'AI Sync:' } } });
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.resolutionMatch.deleteMany();
    await prisma.customerAlias.deleteMany();
    await prisma.customer.deleteMany();
    console.log('Successfully wiped Orders, AI Transactions, and Customers!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
