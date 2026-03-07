import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params explicitly for Next.js 15+ compatibility
        const unwrappedParams = await params;
        const orderId = unwrappedParams.id;

        const { itemIdsToFulfill, locationId } = await request.json();

        if (!itemIdsToFulfill || itemIdsToFulfill.length === 0) {
            return NextResponse.json({ error: 'Must select at least one item to fulfill.' }, { status: 400 });
        }

        // Fetch Order and Items
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true, fulfillments: { include: { items: true } } }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 1. Validate that the requested items belong to this order and are NOT already fulfilled
        const validItemIds = order.items.map(i => i.id);
        const alreadyFulfilledItemIds = order.fulfillments.flatMap(f => f.items.map(fi => fi.orderItemId));

        for (const targetId of itemIdsToFulfill) {
            if (!validItemIds.includes(targetId)) {
                return NextResponse.json({ error: `Item ${targetId} does not belong to this order.` }, { status: 400 });
            }
            if (alreadyFulfilledItemIds.includes(targetId)) {
                return NextResponse.json({ error: `Item ${targetId} is already assigned to an existing fulfillment.` }, { status: 400 });
            }
        }

        // 2. Wrap Fulfillment Creation in a Transaction
        const fulfillment = await prisma.$transaction(async (tx) => {
            // Create the primary DOM Fulfillment wrapper
            const newFulfillment = await tx.fulfillment.create({
                data: {
                    orderId: order.id,
                    locationId: locationId || null, // Which warehouse is packing this?
                    status: 'PACKING'
                }
            });

            // Map the selected Item IDs into the target Fulfillment Box and calculate FIFO
            for (const itemId of itemIdsToFulfill) {
                const targetOrderLine = order.items.find(i => i.id === itemId);
                if (targetOrderLine && targetOrderLine.productId) {
                    let remainingToFulfill = targetOrderLine.quantity;
                    let accumulatedCogs = 0;

                    // Fetch Active Batches for this Product (FIFO Order = oldest first)
                    // If locationId specified by DOM, only pull batches from that specific warehouse
                    const locationFilter = locationId ? { locationId: locationId } : {};
                    const batches = await tx.inventoryBatch.findMany({
                        where: {
                            productId: targetOrderLine.productId,
                            status: 'ACTIVE',
                            ...locationFilter
                        },
                        orderBy: { createdAt: 'asc' }
                    });

                    // Execute FIFO Algorithmic Depletion
                    for (const batch of batches) {
                        if (remainingToFulfill <= 0) break; // Finished picking for this item

                        const takeQty = Math.min(batch.remainingQuantity, remainingToFulfill);

                        // Deduct from Batch
                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: {
                                remainingQuantity: { decrement: takeQty },
                                status: (batch.remainingQuantity - takeQty === 0) ? 'EXHAUSTED' : 'ACTIVE'
                            }
                        });

                        accumulatedCogs += (takeQty * batch.unitCost);
                        remainingToFulfill -= takeQty;

                        // Log granular Batch Deduction
                        await tx.inventoryLog.create({
                            data: {
                                productId: targetOrderLine.productId,
                                quantityChanged: -takeQty,
                                balanceAfter: 0,
                                type: 'OUTBOUND',
                                reference: newFulfillment.id,
                                notes: `FIFO Deduction PO: #${batch.purchaseOrderId || 'N/A'}`
                            }
                        });
                    }

                    // If remainingToFulfill > 0, it means we don't have enough strict batch stock.
                    // This happens if the system had Phase A "legacy stock" without POs.
                    // We just let it slide but we can't assign COGS for the missing quantity reliably.

                    if (remainingToFulfill > 0) {
                        // Log a fallback legacy decrement
                        await tx.inventoryLog.create({
                            data: {
                                productId: targetOrderLine.productId,
                                quantityChanged: -remainingToFulfill,
                                balanceAfter: 0,
                                type: 'OUTBOUND',
                                reference: newFulfillment.id,
                                notes: 'Legacy Aggregate Deduction (Non-Batched)'
                            }
                        });

                        // Deduct from Legacy phase A aggregates
                        await tx.product.update({
                            where: { id: targetOrderLine.productId },
                            data: { stock: { decrement: remainingToFulfill } }
                        });
                    }

                    // Bind item to the fulfillment box with absolute COGS calculated
                    await tx.fulfillmentItem.create({
                        data: {
                            fulfillmentId: newFulfillment.id,
                            orderItemId: targetOrderLine.id,
                            quantity: targetOrderLine.quantity,
                            computedCogs: accumulatedCogs
                        }
                    });
                }
            }

            return newFulfillment;
        });

        return NextResponse.json({ message: 'Fulfillment successfully generated.', fulfillment });
    } catch (error: any) {
        console.error('Error splitting fulfillment:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
