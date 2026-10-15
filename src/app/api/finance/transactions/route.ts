import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const canRead = await checkPermission(session.user.id, "FINANCE", "canRead");
        if (!canRead) {
            return NextResponse.json({ error: "Forbidden: FINANCE read access required." }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get('brandId');

        const whereClause: any = brandId ? { companyBrandId: brandId } : {};

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            take: 100,
            include: { companyBrand: true }
        });
        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const canWrite = await checkPermission(session.user.id, "FINANCE", "canWrite");
        if (!canWrite) {
            return NextResponse.json({ error: "Forbidden: FINANCE write access required." }, { status: 403 });
        }

        const body = await request.json();
        const { type, amount, category, description, date, companyBrandId } = body;

        const newTx = await prisma.transaction.create({
            data: {
                type,
                amount: parseFloat(amount) || 0,
                amountTHB: parseFloat(amount) || 0,
                category,
                description,
                companyBrandId: companyBrandId || null,
                date: date ? new Date(date) : new Date()
            }
        });

        revalidatePath("/finance");

        return NextResponse.json(newTx, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
