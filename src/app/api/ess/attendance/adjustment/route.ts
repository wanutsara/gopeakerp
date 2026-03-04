import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

        // 2. Notify Approvers (Managers & Owners)
        // Find Managers and Owners
        const approvers = await prisma.user.findMany({
            where: { role: { in: ["OWNER", "MANAGER"] } },
            select: { id: true }
        });

        if (approvers.length > 0) {
            const notifications = approvers.map(a => ({
                userId: a.id,
                title: `📝 คำร้องขอปรับเวลา: ${session.user!.name}`,
                message: `เหตุผล: ${reason}`,
                type: "ATTENDANCE_REQUEST",
                referenceId: adjustmentRequest.id
            }));
            await prisma.notification.createMany({ data: notifications });
        }

        return NextResponse.json({ success: true, request: adjustmentRequest });

    } catch (error) {
        console.error("Error submitting time adjustment request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
