import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTargetedNotification } from "@/lib/notifications";

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
            return NextResponse.json({ error: "Employee profile not found" }, { status: 400 });
        }

        const body = await request.json();
        const { date, requestedCheckIn, requestedCheckOut, reason } = body;

        if (!date || !reason || (!requestedCheckIn && !requestedCheckOut)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Create Request
        const adjustmentRequest = await prisma.timeAdjustmentRequest.create({
            data: {
                employeeId: employee.id,
                date: new Date(date),
                requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn) : null,
                requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : null,
                reason
            }
        });

        // 2. Enterprise Routing Matrix (Manager or HR Admins)
        await sendTargetedNotification({
            title: `📝 คำร้องขอปรับเวลา: ${session.user!.name}`,
            message: `เหตุผล: ${reason}`,
            type: "ATTENDANCE_REQUEST",
            referenceId: adjustmentRequest.id,
            managerId: employee.managerId || undefined,
            fallbackModule: "HR"
        });

        return NextResponse.json({ success: true, request: adjustmentRequest });

    } catch (error) {
        console.error("Error submitting time adjustment request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
