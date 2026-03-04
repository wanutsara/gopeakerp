import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const session = await getServerSession(authOptions);
        if (!session || !["OWNER", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        // Fetch existing request to prevent duplicate transactions
        const existingRequest = await prisma.expenseRequest.findUnique({
            where: { id }
        });

        if (!existingRequest) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.expenseRequest.update({
            where: { id },
            data: {
                status,
                approverId: employee?.id
            }
        });

        // Add transaction if PAID and not already paid
        if (status === 'PAID' && existingRequest.status !== 'PAID') {
            await prisma.transaction.create({
                data: {
                    type: "EXPENSE",
                    amount: updated.amount,
                    amountTHB: updated.amount,
                    date: new Date(),
                    category: "PROCUREMENT",
                    description: `จ่ายค่าเบิกจ่าย: ${updated.category || updated.title}`, // Added context
                    expenseRequestId: updated.id,
                    // No createdBy inside Transaction using the standard schema format
                }
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating expense:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
