import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get('brandId');

        const baseOrderWhere = {
            status: { not: "CANCELLED" },
            ...(brandId && { companyBrandId: brandId })
        };

        const baseTxWhere = brandId ? { companyBrandId: brandId } : {};

        // Find Total Orders by Channel
        const channelSales = await prisma.order.groupBy({
            by: ['channel'],
            _sum: { total: true },
            _count: { _all: true },
            where: baseOrderWhere
        });

        const formattedChannelSales = channelSales.map(cs => ({
            channel: cs.channel,
            revenue: cs._sum.total || 0,
            orders: cs._count._all
        })).sort((a, b) => b.revenue - a.revenue);

        // Fetch accounts receivable
        const arData = await prisma.order.aggregate({
            _sum: { total: true },
            where: {
                ...baseOrderWhere,
                isReconciled: false,
            }
        });

        // Aggregating Cash INFLOWS (Revenue)
        const cashInbound = await prisma.transaction.aggregate({
            _sum: { amountTHB: true },
            where: { type: "INCOME", ...baseTxWhere }
        });

        // Aggregating Cash OUTFLOWS (Expenses)
        const expenses = await prisma.transaction.findMany({
            where: { type: "EXPENSE", ...baseTxWhere },
            select: { amountTHB: true, category: true }
        });

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amountTHB, 0);

        // Group expenses by category
        const expenseBreakdown = expenses.reduce((acc: Record<string, number>, e) => {
            const cat = e.category || "OTHER";
            acc[cat] = (acc[cat] || 0) + e.amountTHB;
            return acc;
        }, {});

        const expenseDistribution = Object.keys(expenseBreakdown).map(k => ({
            category: k,
            amount: expenseBreakdown[k]
        })).sort((a, b) => b.amount - a.amount);

        return NextResponse.json({
            channelSales: formattedChannelSales,
            accountsReceivable: arData._sum.total || 0,
            cashReceived: cashInbound._sum.amountTHB || 0,
            totalExpenses,
            expenseDistribution
        });

    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
