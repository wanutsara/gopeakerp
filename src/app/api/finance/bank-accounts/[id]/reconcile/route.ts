import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const canWrite = await checkPermission(session.user.id, "FINANCE", "canWrite");
        if (!canWrite) {
            return NextResponse.json({ error: "Forbidden: FINANCE write access required." }, { status: 403 });
        }

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

        // Guard against cross-brand order injection: a matched order must either be
        // unscoped (HQ/null brand) or belong to this bank account's brand. Reject
        // orders that explicitly belong to a different brand, or that don't exist.
        const matchedOrderIds = stagedItems
            .filter((item: any) => item.matchedOrderId)
            .map((item: any) => item.matchedOrderId as string);
        if (matchedOrderIds.length > 0) {
            const foundOrders = await prisma.order.findMany({
                where: { id: { in: matchedOrderIds } },
                select: { id: true, companyBrandId: true }
            });
            const foundById = new Map(foundOrders.map((o) => [o.id, o]));
            const invalid = matchedOrderIds.filter((oid) => {
                const o = foundById.get(oid);
                if (!o) return true; // non-existent order
                return o.companyBrandId !== null && o.companyBrandId !== bankAccount.companyBrandId;
            });
            if (invalid.length > 0) {
                return NextResponse.json(
                    { error: `Matched orders are invalid or belong to another brand: ${invalid.join(", ")}` },
                    { status: 400 }
                );
            }
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
