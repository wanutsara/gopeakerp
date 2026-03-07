import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { stagedItems } = body;

        if (!stagedItems || !Array.isArray(stagedItems)) {
            return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
        }

        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id }
        });

        if (!bankAccount) {
            return NextResponse.json({ error: "Target Ledger not found." }, { status: 404 });
        }

        // Execute transactions in a Prisma transaction block to ensure atomic completion
        const results = await prisma.$transaction(async (tx) => {
            const createdTxns = [];

            for (const item of stagedItems) {
                // 1. Write the Ledger transaction
                const newTxn = await tx.transaction.create({
                    data: {
                        date: new Date(item.date),
                        amount: item.amount,
                        amountTHB: item.amount, // Base currency is THB
                        type: item.type, // 'INCOME' or 'EXPENSE'
                        category: item.type === 'INCOME' ? 'SALES_REVENUE' : 'OTHER',
                        description: item.description,
                        bankAccountId: bankAccount.id,
                        companyBrandId: bankAccount.companyBrandId,
                    }
                });
                createdTxns.push(newTxn);

                // 2. If the AI Auto-Matched this slip to an existing Order, flag it as Paid/Reconciled!
                if (item.matchedOrderId) {
                    await tx.order.update({
                        where: { id: item.matchedOrderId },
                        data: {
                            isReconciled: true,
                            // Optionally, update status to PAID if it was PENDING
                            // status: 'PAID' (assuming your OrderStatus enum has this if needed, otherwise skip)
                        }
                    });

                    // Log the reconciliation link
                    await tx.orderReconciliation.create({
                        data: {
                            orderId: item.matchedOrderId,
                            transactionId: newTxn.id,
                            amountMatched: item.amount
                        }
                    });
                }
            }
            return createdTxns;
        });

        return NextResponse.json({ success: true, count: results.length });

    } catch (e: any) {
        console.error("Reconciliation Engine Error:", e);
        return NextResponse.json({ error: "Failed to persist ledger entries." }, { status: 500 });
    }
}
