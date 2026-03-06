import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brandId');

        // Fetch bank accounts. If brandId is provided, filter by it. Otherwise show all.
        const bankAccounts = await prisma.bankAccount.findMany({
            where: brandId ? { companyBrandId: brandId } : undefined,
            include: { companyBrand: true },
            orderBy: { createdAt: 'desc' }
        });

        // Compute balances: Sum of transactions linked to this bank account
        const enrichedAccounts = await Promise.all(bankAccounts.map(async (acc) => {
            const income = await prisma.transaction.aggregate({
                where: { bankAccountId: acc.id, type: 'INCOME' },
                _sum: { amount: true }
            });
            const expense = await prisma.transaction.aggregate({
                where: { bankAccountId: acc.id, type: 'EXPENSE' },
                _sum: { amount: true }
            });
            return {
                ...acc,
                computedBalance: (income._sum.amount || 0) - (expense._sum.amount || 0)
            };
        }));

        return NextResponse.json(enrichedAccounts);
    } catch (error) {
        console.error("Bank Accounts GET Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { companyBrandId, bankName, accountNumber, accountName, branch } = body;

        if (!companyBrandId || !bankName || !accountNumber || !accountName) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const newAccount = await prisma.bankAccount.create({
            data: {
                companyBrandId,
                bankName,
                accountNumber,
                accountName,
                branch
            },
            include: { companyBrand: true }
        });

        return NextResponse.json(newAccount);
    } catch (error) {
        console.error("Bank Account POST Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
