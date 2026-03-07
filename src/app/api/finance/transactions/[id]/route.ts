import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { type, amount, category, description, date } = body;

        const updated = await prisma.transaction.update({
            where: { id },
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
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        await prisma.transaction.delete({
            where: { id }
        });

        revalidatePath("/finance");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
