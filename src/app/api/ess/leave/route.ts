import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTargetedNotification } from "@/lib/notifications";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const currentYear = new Date().getFullYear();

        // 1. Fetch Leave Balances
        const leaveBalance = await prisma.leaveBalance.findUnique({
            where: {
                employeeId_year: {
                    employeeId: employee.id,
                    year: currentYear
                }
            }
        });

        // 2. Fetch Leave History
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: { employeeId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            balance: leaveBalance || {
                sickLeaveTotal: 30, sickLeaveUsed: 0,
                personalLeaveTotal: 6, personalLeaveUsed: 0,
                vacationTotal: 6, vacationUsed: 0
            },
            history: leaveRequests
        });

    } catch (error) {
        console.error("Error fetching ESS leave:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const body = await request.json();
        const { type, startDate, endDate, startTime, endTime, requestedHours, reason, attachmentUrl } = body;

        if (!type || !startDate || !endDate || requestedHours === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newLeave = await prisma.leaveRequest.create({
            data: {
                employeeId: employee.id,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                startTime,
                endTime,
                requestedHours: parseFloat(requestedHours),
                reason,
                attachmentUrl,
                status: "PENDING"
            }
        });

        // Enterprise Routing Matrix (Manager or HR Admins)
        await sendTargetedNotification({
            title: "คำขออนุมัติลางาน",
            message: `${session.user.name} ได้ส่งคำขอลางาน จำนวน ${requestedHours} ชั่วโมง ขาดการพิจารณา`,
            type: "LEAVE_REQUEST",
            referenceId: newLeave.id,
            managerId: employee.managerId || undefined,
            fallbackModule: "HR"
        });

        return NextResponse.json({ success: true, request: newLeave });

    } catch (error) {
        console.error("Error creating leave request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
