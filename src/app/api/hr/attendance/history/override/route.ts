import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { timeLogId, employeeId, targetDate, payableCheckInTime, payableCheckOutTime, reason, statusOverride } = body;

        if (!reason || reason.trim().length < 5) {
            return NextResponse.json({ error: "Audit reason is required and must be descriptive." }, { status: 400 });
        }

        // We either update an existing TimeLog, OR we "materialize" a Ghost Row into a real TimeLog.
        let timeLog;

        const hrUserId = session.user.id;

        if (timeLogId && !timeLogId.startsWith('ghost_')) {
            // Updating existing log
            const existingLog = await prisma.timeLog.findUnique({ where: { id: timeLogId } });
            if (!existingLog) return NextResponse.json({ error: "TimeLog not found" }, { status: 404 });

            timeLog = await prisma.$transaction(async (tx) => {
                const updatedLog = await tx.timeLog.update({
                    where: { id: timeLogId },
                    data: {
                        payableCheckInTime: payableCheckInTime ? new Date(payableCheckInTime) : null,
                        payableCheckOutTime: payableCheckOutTime ? new Date(payableCheckOutTime) : null,
                        status: statusOverride || existingLog.status,
                        isOverridden: true
                    }
                });

                await tx.attendanceAuditLog.create({
                    data: {
                        timeLogId: updatedLog.id,
                        changedBy: hrUserId,
                        reason: reason,
                        oldCheckIn: existingLog.payableCheckInTime ?? existingLog.checkInTime,
                        newCheckIn: payableCheckInTime ? new Date(payableCheckInTime) : null,
                        oldCheckOut: existingLog.payableCheckOutTime ?? existingLog.checkOutTime,
                        newCheckOut: payableCheckOutTime ? new Date(payableCheckOutTime) : null
                    }
                });

                return updatedLog;
            });
        } else {
            // Materializing a Ghost Row (creating a new record for a NO-SHOW day to force a status like "ABSENT" or "SICK_LEAVE")
            if (!employeeId || !targetDate) {
                return NextResponse.json({ error: "Missing employeeId or targetDate to materialize ghost row." }, { status: 400 });
            }

            const parsedDate = new Date(targetDate);
            
            timeLog = await prisma.$transaction(async (tx) => {
                // Upsert to be safe
                const newLog = await tx.timeLog.upsert({
                    where: {
                        employeeId_date: {
                            employeeId: employeeId,
                            date: parsedDate
                        }
                    },
                    update: {
                        payableCheckInTime: payableCheckInTime ? new Date(payableCheckInTime) : null,
                        payableCheckOutTime: payableCheckOutTime ? new Date(payableCheckOutTime) : null,
                        status: statusOverride || "ABSENT",
                        isOverridden: true
                    },
                    create: {
                        employeeId: employeeId,
                        date: parsedDate,
                        payableCheckInTime: payableCheckInTime ? new Date(payableCheckInTime) : null,
                        payableCheckOutTime: payableCheckOutTime ? new Date(payableCheckOutTime) : null,
                        status: statusOverride || "ABSENT",
                        isOverridden: true
                    }
                });

                await tx.attendanceAuditLog.create({
                    data: {
                        timeLogId: newLog.id,
                        changedBy: hrUserId,
                        reason: `[Ghost Row Overridden] ` + reason,
                        newCheckIn: payableCheckInTime ? new Date(payableCheckInTime) : null,
                        newCheckOut: payableCheckOutTime ? new Date(payableCheckOutTime) : null
                    }
                });

                return newLog;
            });
        }

        // PHASE 3 TODO: Send LINE/Inbox Notification to Employee for Dispute Right

        return NextResponse.json({ success: true, timeLog });

    } catch (error: any) {
        console.error("HR Timesheet Override API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
