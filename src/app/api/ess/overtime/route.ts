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

        const otRequests = await prisma.overtimeRequest.findMany({
            where: { employeeId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ requests: otRequests });

    } catch (error) {
        console.error("Error fetching ESS overtime:", error);
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
        const { date, startTime, endTime, calculatedHours, multiplier, reason } = body;

        if (!date || !startTime || !endTime || calculatedHours === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newOT = await prisma.overtimeRequest.create({
            data: {
                employeeId: employee.id,
                date: new Date(date),
                startTime,
                endTime,
                calculatedHours: parseFloat(calculatedHours),
                multiplier: parseFloat(multiplier || "1.5"),
                reason,
                status: "PENDING"
            }
        });

        // Enterprise Routing Matrix (Manager or HR Admins)
        await sendTargetedNotification({
            title: "คำขอทำล่วงเวลา (OT)",
            message: `${session.user.name} ได้ส่งคำขอทำ OT จำนวน ${calculatedHours} ชั่วโมง`,
            type: "OVERTIME_REQUEST",
            referenceId: newOT.id,
            managerId: employee.managerId || undefined,
            fallbackModule: "HR"
        });

        return NextResponse.json({ success: true, request: newOT });

    } catch (error) {
        console.error("Error creating overtime request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
