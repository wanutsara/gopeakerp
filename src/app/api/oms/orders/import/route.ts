import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { channel, orders } = body;

        if (!channel || !Array.isArray(orders)) {
            return NextResponse.json({ error: "Invalid payload. 'channel' and 'orders' array required." }, { status: 400 });
        }

        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Fetch all product mappings for this channel to quickly link SKUs
        const mappings = await prisma.channelProduct.findMany({
            where: { channel },
            include: { product: true }
        });

        // Create a dictionary for fast lookup: platformSku -> productId
        const skuToProductId: Record<string, string> = {};
        mappings.forEach(m => {
            skuToProductId[m.platformSku] = m.productId;
        });

        // Process each order sequentially to avoid overwhelming DB and handle unique constraints properly
        for (const orderData of orders) {
            const { platformOrderId, createdAt, status, subtotal, shippingFee, platformFee, discount, total, items, customerName, notes } = orderData;

            if (!platformOrderId) {
                errorCount++;
                continue;
            }

            // Deduplication Check
            const existingOrder = await prisma.order.findUnique({
                where: {
                    platformOrderId_channel: {
                        platformOrderId: String(platformOrderId),
                        channel
                    }
                }
            });

            if (existingOrder) {
                skippedCount++;
                continue;
            }

            try {
                // Determine Order Status based on generic Mapping (Assuming frontend sends generic statuses or raw ones we map later. Let's assume frontend maps it)
                const resolveStatus = (s: string) => {
                    const upper = (s || "").toUpperCase();
                    if (upper.includes("CANCEL")) return "CANCELLED";
                    if (upper.includes("COMPLETED") || upper.includes("DELIVERED") || upper.includes("SUCCESS")) return "COMPLETED";
                    return "PENDING";
                };

                // Create Order and Items in a transaction
                await prisma.$transaction(async (tx) => {
                    const newOrder = await tx.order.create({
                        data: {
                            platformOrderId: String(platformOrderId),
                            channel,
                            status: resolveStatus(status) as any,
                            subtotal: parseFloat(subtotal) || 0,
                            shippingFee: parseFloat(shippingFee) || 0,
                            platformFee: parseFloat(platformFee) || 0,
                            discount: parseFloat(discount) || 0,
                            total: parseFloat(total) || 0,
                            notes: notes || `Customer: ${customerName || 'N/A'}`,
                            createdAt: createdAt ? new Date(createdAt) : new Date(),
                        }
                    });

                    if (Array.isArray(items)) {
                        for (const item of items) {
                            const pSku = String(item.platformSku).trim();
                            const mappedProductId = skuToProductId[pSku] || null;

                            await tx.orderItem.create({
                                data: {
                                    orderId: newOrder.id,
                                    productId: mappedProductId,
                                    productName: item.productName || pSku || "Unknown Product",
                                    quantity: parseInt(item.quantity) || 1,
                                    price: parseFloat(item.price) || 0
                                }
                            });
                        }
                    }
                });

                addedCount++;
            } catch (err) {
                console.error("Failed to process order:", platformOrderId, err);
                errorCount++;
            }
        }

        return NextResponse.json({
            message: "Import finished",
            result: { addedCount, skippedCount, errorCount, totalProcessed: orders.length }
        });

    } catch (error) {
        console.error("Order import error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
