import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: { date: 'desc' },
            take: 50
        });
        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, amount, category, description, date } = body;

        const newTx = await prisma.transaction.create({
            data: {
                type,
                amount: parseFloat(amount) || 0,
                amountTHB: parseFloat(amount) || 0,
                category,
                description,
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
