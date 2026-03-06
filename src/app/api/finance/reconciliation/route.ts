import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        // Fetch Orders that are completed but not yet reconciled (Awaiting Settlement)
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: 'COMPLETED',
                isReconciled: false,
                platformOrderId: { not: null } // Only online platform orders
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                platformOrderId: true,
                channel: true,
                total: true,
                createdAt: true,
                customer: { select: { name: true } }
            }
        });

        // Calculate summary
        const totalPendingAmount = pendingOrders.reduce((sum, order) => sum + order.total, 0);

        return NextResponse.json({
            pendingOrders,
            summary: {
                count: pendingOrders.length,
                totalAmount: totalPendingAmount
            }
        });

    } catch (error) {
        console.error("Reconciliation GET Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { platform, settlementDate, data } = body;
        // data expects: [{ platformOrderId: string, payoutAmount: number }]

        if (!data || !Array.isArray(data) || data.length === 0) {
            return new NextResponse("Invalid settlement data", { status: 400 });
        }

        // 1. Calculate Total Payout across all matched orders in the spreadsheet
        const totalPayout = data.reduce((sum: number, row: any) => sum + Number(row.payoutAmount || 0), 0);

        // 2. Fetch the corresponding Orders from Database
        const platformOrderIds = data.map((d: any) => String(d.platformOrderId).trim());
        const matchedOrders = await prisma.order.findMany({
            where: {
                platformOrderId: { in: platformOrderIds },
                isReconciled: false // Prevent double reconciliation
            }
        });

        if (matchedOrders.length === 0) {
            return NextResponse.json({ success: false, message: "No matching pending orders found." }, { status: 400 });
        }

        // 3. Execute ACID Transaction: Create Master Transaction, Update Orders, Create Reconciliations
        const result = await prisma.$transaction(async (tx) => {
            // A. Create the Master Bank Deposit (Transaction)
            const masterTx = await tx.transaction.create({
                data: {
                    type: 'INCOME',
                    amount: totalPayout,
                    amountTHB: totalPayout,
                    description: `Settlement Payout from ${platform || 'E-Commerce'}`,
                    category: 'E-COMMERCE_SETTLEMENT'
                }
            });

            let totalFeesCalculated = 0;
            const reconciliations = [];

            // B. Process each matching order
            for (const order of matchedOrders) {
                // Find the specific row from the uploaded data mapping to this order
                const excelRow = data.find((d: any) => String(d.platformOrderId).trim() === order.platformOrderId);
                const payoutForThisOrder = Number(excelRow?.payoutAmount || 0);

                // Mathematical Discrepancy (Platform Fee)
                // If Order was 1000, and Payout is 900 -> Fee is 100
                const calculatedFee = order.total - payoutForThisOrder;
                totalFeesCalculated += calculatedFee;

                // Update the Order
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        isReconciled: true,
                        platformFee: calculatedFee
                    }
                });

                // Create the Link (Reconciliation)
                const rec = await tx.orderReconciliation.create({
                    data: {
                        orderId: order.id,
                        transactionId: masterTx.id,
                        amountMatched: payoutForThisOrder
                    }
                });
                reconciliations.push(rec);
            }

            return { masterTx, reconciledCount: matchedOrders.length, totalFeesCalculated };
        });

        return NextResponse.json({
            success: true,
            message: `Successfully reconciled ${result.reconciledCount} orders.`,
            meta: {
                totalFees: result.totalFeesCalculated,
                masterTransactionId: result.masterTx.id
            }
        });

    } catch (error) {
        console.error("Reconciliation POST Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
