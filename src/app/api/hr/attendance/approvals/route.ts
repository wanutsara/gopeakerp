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

        // Only MANAGER and HR/OWNER can approve
        if (session.user.role !== "MANAGER" && session.user.role !== "HR" && session.user.role !== "OWNER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Find the employee profile of the logged-in user
        const currentEmployee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!currentEmployee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }

        // Fetch unapproved TimeLogs for subordinates
        // If HR/OWNER, maybe they can see all unapproved? Let's restrict to direct subordinates for now to enforce the Manager workflow, or allow HR to see all.
        let whereClause: any = { isApproved: false };
        if (session.user.role === "MANAGER") {
            whereClause.employee = { managerId: currentEmployee.id };
        }

        const pendingLogs = await prisma.timeLog.findMany({
            where: whereClause,
            include: {
                employee: {
                    include: {
                        user: true,
                        department: true
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        return NextResponse.json(pendingLogs);
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
        const { timeLogIds } = body;

        if (!Array.isArray(timeLogIds) || timeLogIds.length === 0) {
            return NextResponse.json({ error: "No TimeLogs specified" }, { status: 400 });
        }

        // Update all specified TimeLogs to approved
        const updated = await prisma.timeLog.updateMany({
            where: { id: { in: timeLogIds } },
            data: { isApproved: true }
        });

        return NextResponse.json({ message: "Approved successfully", count: updated.count }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
