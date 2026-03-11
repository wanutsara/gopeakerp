import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }

        // Fetch user's own TimeLogs where Manager has approved them, or they are just pending review
        // In ESS, they want to see everything to track their hours.
        const logs = await prisma.timeLog.findMany({
            where: { employeeId: employee.id },
            orderBy: { date: 'desc' },
            take: 30
        });

        return NextResponse.json(logs);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { timeLogId, action, disputeReason } = body; 
        // action: "ACCEPT" | "DISPUTE"

        if (!timeLogId || !action) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }

        const log = await prisma.timeLog.findUnique({
            where: { id: timeLogId }
        });

        if (!log || log.employeeId !== employee.id) {
            return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });
        }
        
        if (!log.isApproved) {
            return NextResponse.json({ error: "Cannot accept/dispute before Manager Approval" }, { status: 400 });
        }

        if (action === "DISPUTE") {
            if (!disputeReason) return NextResponse.json({ error: "Reason required" }, { status: 400 });
            
            await prisma.timeLog.update({
                where: { id: timeLogId },
                data: { 
                    isDisputed: true, 
                    disputeReason,
                    isApproved: false // Send it back to pending basically, or leave as approved but disputed so HR sees it.
                }
            });
            // Also spawn an Audit Log
            await prisma.attendanceAuditLog.create({
                data: {
                    timeLogId,
                    changedBy: session.user.id,
                    reason: `Employee Disputed: ${disputeReason}`
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
