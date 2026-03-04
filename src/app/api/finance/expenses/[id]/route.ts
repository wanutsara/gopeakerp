import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = session.user.role === "OWNER" || session.user.role === "MANAGER";
        if (!isAdmin) {
            return NextResponse.json({ error: "Only Managers or Owners can approve and pay expenses." }, { status: 403 });
        }

        // We need the logged in user's Employee ID (for approver tracking)
        const approver = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        const body = await request.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ error: "Status is required" }, { status: 400 });
        }

        const existing = await prisma.expenseRequest.findUnique({
            where: { id },
            include: { transaction: true }
        });

        if (!existing) {
            return NextResponse.json({ error: "Expense Request not found" }, { status: 404 });
        }

        // If transitioning to PAID, and hasn't been paid yet
        if (status === "PAID" && existing.status !== "PAID") {
            // We use a transaction to ensure both records are updated atomically
            const result = await prisma.$transaction(async (tx) => {
                const updatedRequest = await tx.expenseRequest.update({
                    where: { id },
                    data: {
                        status: "PAID",
                        approverId: approver?.id
                    },
                    include: { requestor: { select: { user: { select: { name: true } } } } }
                });

                // Check if a transaction already exists just in case (should not happen)
                if (!existing.transaction) {
                    await tx.transaction.create({
                        data: {
                            type: "EXPENSE",
                            amount: updatedRequest.amount,
                            amountTHB: updatedRequest.amount,
                            category: updatedRequest.category || "PROCUREMENT",
                            description: `[PO-PAID] ${updatedRequest.title} (Requested by: ${updatedRequest.requestor.user?.name || 'Unknown'})`,
                            expenseRequestId: updatedRequest.id,
                            date: new Date()
                        }
                    });
                }

                return updatedRequest;
            });
            return NextResponse.json(result);
        }

        // Normal status update (PENDING -> APPROVED or REJECTED)
        const updated = await prisma.expenseRequest.update({
            where: { id },
            data: {
                status,
                approverId: approver?.id
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating expense request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const existing = await prisma.expenseRequest.findUnique({
            where: { id },
            include: { requestor: true }
        });

        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const isAdmin = session.user.role === "OWNER" || session.user.role === "MANAGER";
        const isOwner = existing.requestor.userId === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (existing.status === "PAID") {
            return NextResponse.json({ error: "Cannot delete a paid expense request. It is locked in the cash ledger." }, { status: 400 });
        }

        await prisma.expenseRequest.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting expense request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
