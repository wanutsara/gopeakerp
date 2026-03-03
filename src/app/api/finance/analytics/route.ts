import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        // Find Total Orders by Channel (Using Prisma GroupBy)
        const channelSales = await prisma.order.groupBy({
            by: ['channel'],
            _sum: { total: true },
            _count: { _all: true },
            where: { status: { not: "CANCELLED" } }
        });

        const formattedChannelSales = channelSales.map(cs => ({
            channel: cs.channel,
            revenue: cs._sum.total || 0,
            orders: cs._count._all
        })).sort((a, b) => b.revenue - a.revenue);

        // Find Top Products (From OrderItems)
        const topProductsRaw = await prisma.orderItem.groupBy({
            by: ['productId', 'productName'],
            _sum: { quantity: true, price: true },
        });

        const formattedTopProducts = topProductsRaw
            .map(tp => ({
                id: tp.productId,
                name: tp.productName,
                quantity: tp._sum.quantity || 0,
                // price here is actual price * quantity in best case, but we didn't store total per item.
                // We'll estimate Revenue by sum of price * quantity but Prisma groupBy doesn't do math expr.
                // So we'll just sort by quantity.
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Fetch Accounts Receivable (AR): Orders that are COMPLETED but not RECONCILED (money not in bank yet)
        const arData = await prisma.order.aggregate({
            _sum: { total: true },
            where: { isReconciled: false, status: { not: "CANCELLED" } }
        });

        // Fetch Actual Cash Received
        const cashInbound = await prisma.transaction.aggregate({
            _sum: { amountTHB: true },
            where: { type: "INCOME" }
        });

        return NextResponse.json({
            channelSales: formattedChannelSales,
            topProducts: formattedTopProducts,
            accountsReceivable: arData._sum.total || 0,
            cashReceived: cashInbound._sum.amountTHB || 0
        });

    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json({ error: "Internal server error", details: error.message, stack: error.stack }, { status: 500 });
    }
}
