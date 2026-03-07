import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
            return NextResponse.json({ error: "Forbidden: Only managers can approve leaves" }, { status: 403 });
        }

        const body = await req.json();
        const { status } = body;

        if (!status || !Object.values(ApprovalStatus).includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id }
        });

        if (!leaveRequest) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        const updatedLeave = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: status as ApprovalStatus,
                approvedBy: session.user.id
            }
        });

        // 🎯 Auto Deduction logic
        if (leaveRequest.status !== 'APPROVED' && status === 'APPROVED') {
            const daysToDeduct = (leaveRequest.requestedHours || 0) / 8;
            if (daysToDeduct > 0) {
                const year = leaveRequest.startDate.getFullYear();

                let updateData: any = {};
                if (leaveRequest.type === 'SICK') updateData = { sickLeaveUsed: { increment: daysToDeduct } };
                if (leaveRequest.type === 'PERSONAL') updateData = { personalLeaveUsed: { increment: daysToDeduct } };
                if (leaveRequest.type === 'VACATION') updateData = { vacationUsed: { increment: daysToDeduct } };

                if (Object.keys(updateData).length > 0) {
                    await prisma.leaveBalance.upsert({
                        where: {
                            employeeId_year: {
                                employeeId: leaveRequest.employeeId,
                                year: year
                            }
                        },
                        update: updateData,
                        create: {
                            employeeId: leaveRequest.employeeId,
                            year: year,
                            sickLeaveTotal: 30, // Default standards
                            personalLeaveTotal: 6,
                            vacationTotal: 6,
                            sickLeaveUsed: leaveRequest.type === 'SICK' ? daysToDeduct : 0,
                            personalLeaveUsed: leaveRequest.type === 'PERSONAL' ? daysToDeduct : 0,
                            vacationUsed: leaveRequest.type === 'VACATION' ? daysToDeduct : 0,
                        }
                    });
                }
            }
        }
        // 🔄 Auto Refund logic if changed from APPROVED to REJECTED
        else if (leaveRequest.status === 'APPROVED' && status === 'REJECTED') {
            const daysToRefund = (leaveRequest.requestedHours || 0) / 8;
            if (daysToRefund > 0) {
                const year = leaveRequest.startDate.getFullYear();

                let updateData: any = {};
                if (leaveRequest.type === 'SICK') updateData = { sickLeaveUsed: { decrement: daysToRefund } };
                if (leaveRequest.type === 'PERSONAL') updateData = { personalLeaveUsed: { decrement: daysToRefund } };
                if (leaveRequest.type === 'VACATION') updateData = { vacationUsed: { decrement: daysToRefund } };

                if (Object.keys(updateData).length > 0) {
                    await prisma.leaveBalance.updateMany({
                        where: {
                            employeeId: leaveRequest.employeeId,
                            year: year
                        },
                        data: updateData
                    });
                }
            }
        }

        return NextResponse.json(updatedLeave);
    } catch (err: any) {
        console.error("Leave Request Update Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
