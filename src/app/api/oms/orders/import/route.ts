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

            const resolveStatus = (s: string) => {
                const upper = (s || "").toUpperCase();
                if (upper.includes("CANCEL")) return "CANCELLED";
                if (upper.includes("COMPLETED") || upper.includes("DELIVERED") || upper.includes("SUCCESS")) return "COMPLETED";
                return "PENDING";
            };

            const resolvedStatus = resolveStatus(status);

            // Deduplication & State Update Check
            const existingOrder = await prisma.order.findUnique({
                where: {
                    platformOrderId_channel: {
                        platformOrderId: String(platformOrderId),
                        channel
                    }
                }
            });

            if (existingOrder) {
                // Ghost Fulfillment: If order arrived as PENDING yesterday, but today's CSV says COMPLETED
                if (existingOrder.status !== "COMPLETED" && resolvedStatus === "COMPLETED") {
                    try {
                        await prisma.$transaction(async (tx) => {
                            // 1. Update order status
                            await tx.order.update({
                                where: { id: existingOrder.id },
                                data: { status: "COMPLETED" }
                            });

                            // 2. Fetch its items and Deduct Stock
                            const orderItems = await tx.orderItem.findMany({ where: { orderId: existingOrder.id } });
                            for (const item of orderItems) {
                                if (item.productId) {
                                    const updatedProd = await tx.product.update({
                                        where: { id: item.productId },
                                        data: { stock: { decrement: item.quantity } }
                                    });

                                    // 3. Write Ledger
                                    await tx.inventoryLog.create({
                                        data: {
                                            productId: item.productId,
                                            type: "OUTBOUND",
                                            quantityChanged: -item.quantity,
                                            balanceAfter: updatedProd.stock,
                                            reference: String(existingOrder.platformOrderId),
                                            notes: `[Auto-Update] Order status changed to COMPLETED`,
                                            createdBy: "SYSTEM_IMPORT"
                                        }
                                    });
                                }
                            }
                        });
                        addedCount++; // Treat as processed/updated
                    } catch (err) {
                        console.error("Failed to update order to COMPLETED:", platformOrderId, err);
                        errorCount++;
                    }
                } else {
                    skippedCount++;
                }
                continue;
            }

            try {
                // Create New Order and Items in a transaction
                await prisma.$transaction(async (tx) => {
                    const newOrder = await tx.order.create({
                        data: {
                            platformOrderId: String(platformOrderId),
                            channel,
                            status: resolvedStatus as any,
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
                            const qty = parseInt(item.quantity) || 1;

                            await tx.orderItem.create({
                                data: {
                                    orderId: newOrder.id,
                                    productId: mappedProductId,
                                    productName: item.productName || pSku || "Unknown Product",
                                    quantity: qty,
                                    price: parseFloat(item.price) || 0
                                }
                            });

                            // --- PHASE 9: AUTO-DEDUCTION (GHOST FULFILLMENT) FOR NEW ORDERS ---
                            if (mappedProductId && resolvedStatus === "COMPLETED") {
                                const updatedProduct = await tx.product.update({
                                    where: { id: mappedProductId },
                                    data: { stock: { decrement: qty } }
                                });

                                await tx.inventoryLog.create({
                                    data: {
                                        productId: mappedProductId,
                                        type: "OUTBOUND",
                                        quantityChanged: -qty,
                                        balanceAfter: updatedProduct.stock,
                                        reference: String(platformOrderId),
                                        notes: `[Auto-Deduction] New ${channel} Order`,
                                        createdBy: "SYSTEM_IMPORT"
                                    }
                                });
                            }
                        }
                    }
                });

                addedCount++;
            } catch (err) {
                console.error("Failed to process new order:", platformOrderId, err);
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
