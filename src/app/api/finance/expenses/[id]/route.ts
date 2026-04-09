import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/rbac";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hasPermission = await checkPermission(session.user.id, "EXPENSES", "canWrite");
        if (!hasPermission) {
            return NextResponse.json({ error: "Only authorized personnel can approve and pay expenses." }, { status: 403 });
        }

        // We need the logged in user's Employee ID (for approver tracking)
        const approver = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        const body = await request.json();
        const { status, whtRate, whtAmount, netPayable } = body;

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
                        approverId: approver?.id,
                        whtRate: whtRate !== undefined ? parseFloat(whtRate) : existing.whtRate,
                        whtAmount: whtAmount !== undefined ? parseFloat(whtAmount) : existing.whtAmount,
                        netPayable: netPayable !== undefined ? parseFloat(netPayable) : existing.netPayable
                    },
                    include: { requestor: { select: { user: { select: { name: true } } } } }
                });

                // Check if a transaction already exists just in case (should not happen)
                if (!existing.transaction) {
                    await tx.transaction.create({
                        data: {
                            type: "EXPENSE",
                            amount: updatedRequest.netPayable || updatedRequest.amount,
                            amountTHB: updatedRequest.netPayable || updatedRequest.amount,
                            taxAmount: updatedRequest.whtAmount,
                            taxType: updatedRequest.whtAmount > 0 ? (updatedRequest.category === 'Company' ? 'PND53' : 'PND3') : null,
                            category: updatedRequest.category || "PROCUREMENT",
                            description: `[EXPENSE-PAID] ${updatedRequest.title} (Requested by: ${updatedRequest.requestor.user?.name || 'Unknown'})`,
                            expenseRequestId: updatedRequest.id,
                            date: new Date()
                        }
                    });
                }

                return updatedRequest;
            });

            revalidatePath("/finance");
            revalidatePath("/finance/expenses");

            return NextResponse.json(result);
        }

        // Normal status update (PENDING -> APPROVED or REJECTED)
        const updated = await prisma.expenseRequest.update({
            where: { id },
            data: {
                status,
                approverId: approver?.id,
                whtRate: whtRate !== undefined ? parseFloat(whtRate) : existing.whtRate,
                whtAmount: whtAmount !== undefined ? parseFloat(whtAmount) : existing.whtAmount,
                netPayable: netPayable !== undefined ? parseFloat(netPayable) : existing.netPayable
            }
        });

        revalidatePath("/finance/expenses");

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

        const hasAdminPermission = await checkPermission(session.user.id, "EXPENSES", "canDelete");
        const isOwner = existing.requestor.userId === session.user.id;

        if (!hasAdminPermission && !isOwner) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (existing.status === "PAID") {
            return NextResponse.json({ error: "Cannot delete a paid expense request. It is locked in the cash ledger." }, { status: 400 });
        }

        await prisma.expenseRequest.delete({
            where: { id }
        });

        revalidatePath("/finance/expenses");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting expense request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
