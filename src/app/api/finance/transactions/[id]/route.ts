import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
        const { type, amount, category, description, date, companyBrandId } = body;

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                type,
                amount: parseFloat(amount) || 0,
                amountTHB: parseFloat(amount) || 0,
                category,
                description,
                companyBrandId: companyBrandId !== undefined ? companyBrandId : undefined,
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
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const canDelete = await checkPermission(session.user.id, "FINANCE", "canDelete");
        if (!canDelete) {
            return NextResponse.json({ error: "Forbidden: FINANCE delete access required." }, { status: 403 });
        }

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
