import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["OWNER", "MANAGER", "HR"].includes(session.user?.role || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const status = url.searchParams.get('status') || undefined;

        const requests = await prisma.timeAdjustmentRequest.findMany({
            where: {
                status: (status as any) || undefined
            },
            include: {
                employee: {
                    include: {
                        user: { select: { name: true } },
                        department: { select: { name: true } }
                    }
                },
                reviewer: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Error fetching adjustment requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !["OWNER", "MANAGER", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, action, adminComment } = body;

        if (!id || !["APPROVED", "REJECTED"].includes(action)) {
            return NextResponse.json({ error: "Invalid action or missing ID" }, { status: 400 });
        }

        const targetRequest = await prisma.timeAdjustmentRequest.findUnique({
            where: { id },
            include: { employee: { select: { userId: true } } }
        });

        if (!targetRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // 1. Update Request
        const updatedRequest = await prisma.timeAdjustmentRequest.update({
            where: { id },
            data: {
                status: action,
                adminComment,
                reviewerId: session.user.id
            }
        });

        // 2. If APPROVED, try to update or create TimeLog
        if (action === "APPROVED") {
            // Find existing TimeLog for this employee and date
            // The request date is at midnight UTC, so we need to match the date part.
            // A simple approach is searching TimeLog by employeeId and Date
            const startOfDay = new Date(targetRequest.date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(targetRequest.date);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const existingLog = await prisma.timeLog.findFirst({
                where: {
                    employeeId: targetRequest.employeeId,
                    date: { gte: startOfDay, lte: endOfDay }
                }
            });

            if (existingLog) {
                // Determine new status if check-in is updated
                let newStatus = existingLog.status;
                if (targetRequest.requestedCheckIn) {
                    const tenAM = new Date(targetRequest.date);
                    tenAM.setHours(10, 0, 0, 0); // 10:00 AM local threshold
                    if (new Date(targetRequest.requestedCheckIn) > tenAM) {
                        newStatus = "LATE";
                    } else {
                        newStatus = "ON_TIME";
                    }
                }

                await prisma.timeLog.update({
                    where: { id: existingLog.id },
                    data: {
                        checkInTime: targetRequest.requestedCheckIn || existingLog.checkInTime,
                        checkOutTime: targetRequest.requestedCheckOut || existingLog.checkOutTime,
                        status: newStatus
                    }
                });
            } else {
                // If it doesn't exist, we create one
                // Assume default status
                let status = "ON_TIME";
                if (targetRequest.requestedCheckIn) {
                    const tenAM = new Date(targetRequest.date);
                    tenAM.setHours(10, 0, 0, 0);
                    if (new Date(targetRequest.requestedCheckIn) > tenAM) {
                        status = "LATE";
                    }
                }
                await prisma.timeLog.create({
                    data: {
                        employeeId: targetRequest.employeeId,
                        date: targetRequest.date,
                        checkInTime: targetRequest.requestedCheckIn,
                        checkOutTime: targetRequest.requestedCheckOut,
                        status: status
                    }
                });
            }
        }

        // 3. Notify the Employee
        await prisma.notification.create({
            data: {
                userId: targetRequest.employee.userId,
                title: action === "APPROVED" ? `✅ อนุมัติ: แก้ไขเวลาทำงาน` : `❌ ปฏิเสธ: แก้ไขเวลาทำงาน`,
                message: adminComment ? `หมายเหตุจาก HR: ${adminComment}` : (action === "APPROVED" ? `ระบบได้ปรับแก้เวลาตามคำร้องแล้ว` : `คำร้องของคุณถูกปฏิเสธ`),
                type: "SYSTEM"
            }
        });

        revalidatePath("/hr/attendance");
        revalidatePath("/hr/attendance/requests");

        return NextResponse.json({ success: true, updatedRequest });

    } catch (error) {
        console.error("Error updating adjustment request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
