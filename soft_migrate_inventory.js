const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function softMigrate() {
    console.log("🚀 Starting Phase A: Soft Migration into Multi-Location OMS...");

    try {
        // 1. Create Default Main Warehouse
        let mainLocation = await prisma.location.findFirst({ where: { isDefault: true } });
        if (!mainLocation) {
            console.log("📦 Creating Default 'Main Warehouse' Location...");
            mainLocation = await prisma.location.create({
                data: {
                    name: "Main Warehouse (BKK)",
                    type: "WAREHOUSE",
                    isDefault: true,
                    address: "Auto-generated during Phase A OMS Upgrade",
                }
            });
        } else {
            console.log(`✅ Default Location already exists: ${mainLocation.name}`);
        }

        // 2. Fetch all existing products
        const products = await prisma.product.findMany({
            include: { inventoryLevels: true }
        });

        console.log(`🔍 Found ${products.length} legacy products to migrate.`);
        let migratedCount = 0;

        // 3. Migrate their flat stock into InventoryLevels linked to the Main Warehouse
        for (const product of products) {
            // Only migrate if it doesn't already have an inventory level for this location
            const hasLevel = product.inventoryLevels.some(l => l.locationId === mainLocation.id);

            if (!hasLevel) {
                await prisma.inventoryLevel.create({
                    data: {
                        productId: product.id,
                        locationId: mainLocation.id,
                        available: product.stock, // Move the flat stock to explicitly available
                        committed: 0,
                        incoming: 0
                    }
                });
                migratedCount++;
            }
        }

        console.log(`✅ Soft Migration Complete! Successfully mapped ${migratedCount} products to the Multi-Location engine.`);

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

softMigrate();
