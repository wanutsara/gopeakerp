import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaveType } from "@prisma/client";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = session.user.role;
        const userId = session.user.id;

        // If OWNER or MANAGER, can see all leave requests
        if (userRole === "OWNER" || userRole === "MANAGER") {
            const leaves = await prisma.leaveRequest.findMany({
                include: {
                    employee: {
                        include: {
                            user: true
                        }
                    }
                },
                orderBy: {
                    startDate: 'desc'
                }
            });
            return NextResponse.json(leaves);
        } else {
            // If STAFF, only see their own
            const leaves = await prisma.leaveRequest.findMany({
                where: {
                    employee: {
                        userId: userId
                    }
                },
                include: {
                    employee: {
                        include: {
                            user: true
                        }
                    }
                },
                orderBy: {
                    startDate: 'desc'
                }
            });
            return NextResponse.json(leaves);
        }

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type, startDate, endDate, startTime, endTime, requestedHours, reason, attachmentUrl, employeeId, status } = body;

        if (!type || !startDate || !endDate || requestedHours === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Find the employee ID for the current user or use requested employeeId if Admin
        let targetEmployeeId = "";
        if ((session.user.role === "OWNER" || session.user.role === "MANAGER") && employeeId) {
            targetEmployeeId = employeeId;
        } else {
            const employee = await prisma.employee.findUnique({
                where: { userId: session.user.id }
            });
            if (!employee) {
                return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
            }
            targetEmployeeId = employee.id;
        }

        // Component 3 Guard: Cannot request leave if there is approved OT on that day
        const targetDate = new Date(startDate);
        const existingOT = await prisma.overtimeRequest.findFirst({
            where: {
                employeeId: targetEmployeeId,
                status: "APPROVED",
                date: targetDate
            }
        });

        if (existingOT) {
            return NextResponse.json({ error: "Cannot request leave on a day with an approved Overtime request." }, { status: 400 });
        }

        const leaveStatus = ((session.user.role === "OWNER" || session.user.role === "MANAGER") && status) ? status : "PENDING";

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                employeeId: targetEmployeeId,
                type: type as LeaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                startTime,
                endTime,
                requestedHours: parseFloat(requestedHours),
                reason: reason || null,
                attachmentUrl: attachmentUrl || null,
                status: leaveStatus,
                approvedBy: leaveStatus === 'APPROVED' ? session.user.id : null
            }
        });

        if (leaveStatus === 'APPROVED') {
            const daysToDeduct = parseFloat(requestedHours) / 8;
            if (daysToDeduct > 0) {
                const year = new Date(startDate).getFullYear();

                let updateData: any = {};
                if (type === 'SICK') updateData = { sickLeaveUsed: { increment: daysToDeduct } };
                if (type === 'PERSONAL') updateData = { personalLeaveUsed: { increment: daysToDeduct } };
                if (type === 'VACATION') updateData = { vacationUsed: { increment: daysToDeduct } };

                if (Object.keys(updateData).length > 0) {
                    await prisma.leaveBalance.upsert({
                        where: { employeeId_year: { employeeId: targetEmployeeId, year: year } },
                        update: updateData,
                        create: {
                            employeeId: targetEmployeeId,
                            year: year,
                            sickLeaveTotal: 30, // Default standards
                            personalLeaveTotal: 6,
                            vacationTotal: 6,
                            sickLeaveUsed: type === 'SICK' ? daysToDeduct : 0,
                            personalLeaveUsed: type === 'PERSONAL' ? daysToDeduct : 0,
                            vacationUsed: type === 'VACATION' ? daysToDeduct : 0,
                        }
                    });
                }
            }
        }

        return NextResponse.json(leaveRequest, { status: 201 });
    } catch (err: any) {
        console.error("Leave Create Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
