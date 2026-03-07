import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id },
            include: { companyBrand: true }
        });

        if (!bankAccount) {
            return NextResponse.json({ error: "Bank Account Not Found" }, { status: 404 });
        }

        // Compute Live Balance
        const incomeStream = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { bankAccountId: bankAccount.id, type: 'INCOME' },
        });

        const expenseStream = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { bankAccountId: bankAccount.id, type: 'EXPENSE' },
        });

        const computedBalance = (incomeStream._sum.amount || 0) - (expenseStream._sum.amount || 0);

        return NextResponse.json({ ...bankAccount, computedBalance });

    } catch (error) {
        console.error("GET Ledger Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
