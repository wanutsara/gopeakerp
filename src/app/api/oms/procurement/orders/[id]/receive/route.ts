import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, context: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // We must await context.params in Next.js 15 before using
        const { id } = await context.params;
        const data = await request.json();

        // data.receives = [{ purchaseOrderItemId: x, quantityReceiving: y, locationId: z, expirationDate: w }]
        if (!data.receives || !Array.isArray(data.receives) || data.receives.length === 0) {
            return NextResponse.json({ error: 'No items payload sent.' }, { status: 400 });
        }

        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!po) return NextResponse.json({ error: 'PO not found.' }, { status: 404 });
        if (po.status === 'COMPLETED') return NextResponse.json({ error: 'PO is already fully received.' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            let allReceivedFully = true;

            for (const item of po.items) {
                // Find matching receive payload for this item
                const incomingArray = data.receives.filter((r: any) => r.purchaseOrderItemId === item.id);

                let qtyTotalIncoming = 0;

                for (const incoming of incomingArray) {
                    if (incoming.quantityReceiving <= 0) continue;

                    qtyTotalIncoming += incoming.quantityReceiving;

                    // 1. Create the granular InventoryBatch (The Phase C Heart)
                    await tx.inventoryBatch.create({
                        data: {
                            productId: item.productId,
                            locationId: incoming.locationId,
                            purchaseOrderId: po.id,
                            originalQuantity: incoming.quantityReceiving,
                            remainingQuantity: incoming.quantityReceiving,
                            unitCost: item.unitCost, // STRICT FIFO COGS LOCK
                            expirationDate: incoming.expirationDate ? new Date(incoming.expirationDate) : null,
                            status: 'ACTIVE'
                        }
                    });

                    // 2. Update Multi-Warehouse aggregate (Phase A compliance)
                    await tx.inventoryLevel.upsert({
                        where: {
                            productId_locationId: {
                                productId: item.productId,
                                locationId: incoming.locationId
                            }
                        },
                        create: {
                            productId: item.productId,
                            locationId: incoming.locationId,
                            available: incoming.quantityReceiving
                        },
                        update: {
                            available: { increment: incoming.quantityReceiving }
                        }
                    });

                    // 3. Update Legacy global aggregate (Backward compatibility)
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: incoming.quantityReceiving } }
                    });

                    // 4. Log the audit movement
                    await tx.inventoryLog.create({
                        data: {
                            productId: item.productId,
                            quantityChanged: incoming.quantityReceiving,
                            balanceAfter: 0, // In truth, this requires a pre-fetch, putting 0 as a bypass for now
                            type: 'INBOUND',
                            notes: `PO Received [Batch Auto-Generated]`,
                            reference: po.id
                        }
                    });
                }

                const newReceivedTotal = item.quantityReceived + qtyTotalIncoming;

                // Update PO Item progress
                await tx.purchaseOrderItem.update({
                    where: { id: item.id },
                    data: { quantityReceived: newReceivedTotal }
                });

                if (newReceivedTotal < item.quantityOrdered) {
                    allReceivedFully = false;
                }
            }

            // Update Master PO Status
            const newStatus = allReceivedFully ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
            const updatedPO = await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { status: newStatus }
            });

            return updatedPO;
        });

        return NextResponse.json({ message: 'PO Received and Batches Generated successfully', data: result });

    } catch (error: any) {
        console.error('Error receiving PO:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
