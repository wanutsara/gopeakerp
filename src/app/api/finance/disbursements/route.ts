import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { totalAmount, slipUrl, bankAccountId, notes, items } = body;

        if (!items || items.length === 0) {
            return new NextResponse("No liabilities selected for disbursement", { status: 400 });
        }

        // Segregate Item IDs
        const expenseIds = items.filter((i: any) => i.type === 'EXPENSE').map((i: any) => i.id);
        const payrollIds = items.filter((i: any) => i.type === 'PAYROLL').map((i: any) => i.id);
        const poIds = items.filter((i: any) => i.type === 'PO').map((i: any) => i.id);

        // Execute as an Atomic Transaction to ensure the Ledger balances out perfectly
        const disbursement = await prisma.$transaction(async (tx) => {
            // 1. Create the Master Disbursement
            const disb = await tx.disbursement.create({
                data: {
                    totalAmount,
                    slipUrl,
                    bankAccountId,
                    notes,
                    status: 'TRANSFERRED',
                    executionDate: new Date(),
                }
            });

            // 2. Mark Expenses as PAID
            if (expenseIds.length > 0) {
                await tx.expenseRequest.updateMany({
                    where: { id: { in: expenseIds } },
                    data: { status: 'PAID', disbursementId: disb.id }
                });
            }

            // 3. Mark Payrolls as PAID
            if (payrollIds.length > 0) {
                await tx.payroll.updateMany({
                    where: { id: { in: payrollIds } },
                    data: { status: 'PAID', disbursementId: disb.id }
                });
            }

            // 4. Mark POs with disbursementId 
            if (poIds.length > 0) {
                await tx.purchaseOrder.updateMany({
                    where: { id: { in: poIds } },
                    data: { disbursementId: disb.id }
                });
            }

            // 5. Create the Master Ledger Entry (Transaction)
            await tx.transaction.create({
                data: {
                    type: 'EXPENSE',
                    amount: totalAmount,
                    amountTHB: totalAmount,
                    description: `Cash Outflow: AP Disbursement #${disb.id.substring(disb.id.length - 6).toUpperCase()} ${notes ? '- ' + notes : ''}`,
                    category: 'OPERATIONAL', // Master aggregation category
                    date: new Date()
                }
            });

            return disb;
        });

        return NextResponse.json(disbursement);

    } catch (error: any) {
        console.error("Error executing Master Disbursement:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
