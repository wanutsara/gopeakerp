import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: customerId } = await params;
        const body = await request.json();
        const { channel, subtotal, discount, shippingFee, total, date, items, notes } = body;

        if (!total || total <= 0) {
            return NextResponse.json({ error: 'Order must have a valid total.' }, { status: 400 });
        }

        // 1. Verify Customer exists and is not archived
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer || customer.isArchived) {
            return NextResponse.json({ error: 'Customer not found or is archived.' }, { status: 404 });
        }

        // 2. We use an interactive transaction to ensure Data Integrity (Order + Inventory + CRM Update)
        const result = await prisma.$transaction(async (tx) => {
            // A. Create the Order
            const newOrder = await tx.order.create({
                data: {
                    customerId,
                    channel: channel || 'OTHER',
                    status: 'COMPLETED', // Manual ingestion is assumed completed initially
                    subtotal: Number(subtotal),
                    discount: Number(discount),
                    shippingFee: Number(shippingFee),
                    total: Number(total),
                    notes: notes || 'Manual Injection via CRM',
                    createdAt: date ? new Date(date) : new Date(),
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId || null,
                            productName: item.productName || 'Unknown Item',
                            quantity: Number(item.quantity) || 1,
                            price: Number(item.price) || 0,
                            subtotal: (Number(item.quantity) || 1) * (Number(item.price) || 0)
                        }))
                    }
                },
                include: { items: true }
            });

            // B. Inventory Deduction (SKU Coupling)
            const staffId = session.user?.id || 'SYSTEM';

            for (const item of items) {
                if (item.productId) {
                    // Reduce Physical Stock
                    const updatedProduct = await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: Number(item.quantity) || 1 } }
                    });

                    // Log the movement for Warehouse Audit
                    await tx.inventoryLog.create({
                        data: {
                            productId: item.productId,
                            type: 'OUTBOUND',
                            quantityChanged: -(Number(item.quantity) || 1),
                            balanceAfter: updatedProduct.stock,
                            reference: `ORDER-${newOrder.id}`,
                            notes: `Manual CRM Order by ${session.user?.name || staffId}`,
                            createdBy: staffId
                        }
                    });
                }
            }

            // C. Update Customer Lifetime Value (LTV)
            await tx.customer.update({
                where: { id: customerId },
                data: { totalSpent: { increment: Number(total) } }
            });

            return newOrder;
        });

        return NextResponse.json({ success: true, order: result });

    } catch (error: any) {
        console.error('Manual Order API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
