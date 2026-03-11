import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting migration: Assigning orphaned transactions to primary brand...");

    // Find the primary brand (the first one)
    const primaryBrand = await prisma.companyBrand.findFirst({
        orderBy: { createdAt: 'asc' }
    });

    if (!primaryBrand) {
        console.error("No company brand found. Cannot migrate transactions.");
        process.exit(1);
    }

    console.log(`Primary Brand Found: ${primaryBrand.name} (${primaryBrand.id})`);

    // Update all transactions that have no brand assigned
    const result = await prisma.transaction.updateMany({
        where: {
            companyBrandId: null
        },
        data: {
            companyBrandId: primaryBrand.id
        }
    });

    console.log(`Successfully migrated ${result.count} orphaned transactions to brand ${primaryBrand.name}.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
