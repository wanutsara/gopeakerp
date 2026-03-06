import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        // Retrieve last 30 days of transactions for the flow
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const txs = await prisma.transaction.findMany({
            where: { date: { gte: thirtyDaysAgo } }
        });

        // Compute buckets
        let totalIncome = 0;
        let cogs = 0; // PRODUCT_COST
        let payroll = 0; // PAYROLL
        let ads = 0; // ADVERTISING
        let shipping = 0; // SHIPPING
        let ops = 0; // OPERATIONAL / OTHER

        txs.forEach((t) => {
            if (t.type === 'INCOME') {
                totalIncome += t.amountTHB;
            } else {
                switch (t.category) {
                    case 'PRODUCT_COST': cogs += t.amountTHB; break;
                    case 'PAYROLL': payroll += t.amountTHB; break;
                    case 'ADVERTISING': ads += t.amountTHB; break;
                    case 'SHIPPING': shipping += t.amountTHB; break;
                    default: ops += t.amountTHB; break;
                }
            }
        });

        const totalExpenses = cogs + payroll + ads + shipping + ops;
        const netCash = totalIncome - totalExpenses;

        return NextResponse.json({
            period: "Last 30 Days",
            totalIncome,
            expenses: {
                cogs,
                payroll,
                ads,
                shipping,
                operational: ops,
                total: totalExpenses
            },
            netCash
        });

    } catch (error: any) {
        console.error("Sankey Analysis Error:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
