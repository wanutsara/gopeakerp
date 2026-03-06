import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const locations = await prisma.location.findMany({
            orderBy: { isDefault: 'desc' },
            include: {
                _count: {
                    select: { inventoryLevels: true }
                }
            }
        });
        return NextResponse.json({ success: true, locations });
    } catch (error) {
        console.error('Failed to fetch locations:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch inventory locations' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, type, address, isDefault } = body;

        // If setting this to default, unset others first
        if (isDefault) {
            await prisma.location.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        const newLocation = await prisma.location.create({
            data: {
                name,
                type: type || 'WAREHOUSE',
                address,
                isDefault: isDefault || false,
            }
        });

        // Whenever a new location is created, automatically spawn 0 stock InventoryLevels for all existing products
        const products = await prisma.product.findMany({ select: { id: true } });
        if (products.length > 0) {
            const inventoryPayload = products.map(p => ({
                productId: p.id,
                locationId: newLocation.id,
                available: 0,
                committed: 0,
                incoming: 0
            }));
            await prisma.inventoryLevel.createMany({ data: inventoryPayload });
        }

        return NextResponse.json({ success: true, location: newLocation });
    } catch (error) {
        console.error('Failed to create location:', error);
        return NextResponse.json({ success: false, error: 'Failed to create inventory location' }, { status: 500 });
    }
}
