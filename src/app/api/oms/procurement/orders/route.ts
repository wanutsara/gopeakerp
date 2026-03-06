import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orders = await prisma.purchaseOrder.findMany({
            include: {
                supplier: true,
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(orders);
    } catch (error: any) {
        console.error('Error fetching POs:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        if (!data.supplierId || !data.items || data.items.length === 0) {
            return NextResponse.json({ error: 'Missing supplier or items' }, { status: 400 });
        }

        // Calculate total value
        const totalValue = data.items.reduce((sum: number, item: any) => sum + (item.quantityOrdered * item.unitCost), 0);

        const newPo = await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.create({
                data: {
                    supplierId: data.supplierId,
                    status: 'ISSUED',
                    totalValue: totalValue,
                    notes: data.notes || null,
                    aiReasoning: data.aiReasoning || null
                }
            });

            for (const item of data.items) {
                await tx.purchaseOrderItem.create({
                    data: {
                        purchaseOrderId: po.id,
                        productId: item.productId,
                        quantityOrdered: item.quantityOrdered,
                        quantityReceived: 0,
                        unitCost: item.unitCost,
                        totalCost: item.quantityOrdered * item.unitCost
                    }
                });
            }

            return po;
        });

        return NextResponse.json(newPo);
    } catch (error: any) {
        console.error('Error creating PO:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
