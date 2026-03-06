import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        // 1. Fetch Approved but Unpaid Expenses
        const expenses = await prisma.expenseRequest.findMany({
            where: { status: 'APPROVED', disbursementId: null },
            include: { requestor: true, department: true }
        });

        // 2. Fetch Approved but Unpaid Payrolls
        const payrolls = await prisma.payroll.findMany({
            where: { status: 'UNPAID', disbursementId: null },
            include: { employee: true }
        });

        // 3. Fetch Issued POs (Unpaid if not linked to a disbursement)
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] },
                disbursementId: null
            },
            include: { supplier: true }
        });

        // 4. Normalize the Response Payload into a Unified AP Queue
        const payload = [
            ...expenses.map(e => ({
                type: 'EXPENSE',
                id: e.id,
                title: e.title,
                amount: e.amount,
                date: e.createdAt,
                payee: `${e.requestor.firstName} ${e.requestor.lastName}`
            })),
            ...payrolls.map(p => ({
                type: 'PAYROLL',
                id: p.id,
                title: `Payroll ${p.month}`,
                amount: p.netSalary,
                date: p.createdAt,
                payee: `${p.employee.firstName} ${p.employee.lastName}`
            })),
            ...purchaseOrders.map(po => ({
                type: 'PO',
                id: po.id,
                title: `PO for ${po.supplier.name}`,
                amount: po.totalValue,
                date: po.createdAt,
                payee: po.supplier.name
            }))
        ];

        // Sort dynamically by oldest first (highest priority to pay)
        payload.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json(payload);

    } catch (error: any) {
        console.error("Error fetching Accounts Payable:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
