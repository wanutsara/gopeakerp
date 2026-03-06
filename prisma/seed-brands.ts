import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Brand Dimensions...');

    // 1. Create Core Brands
    type BrandConfig = { name: string; isHQ: boolean; legalName: string; taxId: string };
    const brands: BrandConfig[] = [
        { name: 'HQ', isHQ: true, legalName: 'GOPEAK Holdings Co., Ltd.', taxId: '0105500000000' },
        { name: 'Tamaya', isHQ: false, legalName: 'Tamaya Retail Co., Ltd.', taxId: '0105511111111' },
        { name: 'SameSame', isHQ: false, legalName: 'SameSame Studio Co., Ltd.', taxId: '0105522222222' }
    ];

    const createdBrands = [];
    for (const b of brands) {
        const brand = await prisma.companyBrand.upsert({
            where: { name: b.name },
            update: {},
            create: b
        });
        createdBrands.push(brand);
        console.log(`Upserted Brand: ${brand.name}`);
    }

    const hqBrand = createdBrands.find(b => b.isHQ);

    if (hqBrand) {
        console.log('Orphan Rescue: Linking existing data to HQ...');

        // Assign users to HQ access
        const users = await prisma.user.findMany();
        for (const u of users) {
            await prisma.userBrandAccess.upsert({
                where: { userId_companyBrandId: { userId: u.id, companyBrandId: hqBrand.id } },
                update: {},
                create: { userId: u.id, companyBrandId: hqBrand.id }
            });
        }

        // Assign orphaned employees to HQ
        const updatedEmployees = await prisma.employee.updateMany({
            where: { companyBrandId: null },
            data: { companyBrandId: hqBrand.id }
        });
        console.log(`Moved ${updatedEmployees.count} orphaned employees to HQ.`);

        // Assign orphaned orders to HQ
        const updatedOrders = await prisma.order.updateMany({
            where: { companyBrandId: null },
            data: { companyBrandId: hqBrand.id }
        });
        console.log(`Moved ${updatedOrders.count} orphaned orders to HQ.`);
    }

    console.log('Seeding complete! 🚀');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
