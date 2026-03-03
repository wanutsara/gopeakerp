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
        const { type, startDate, endDate, reason, attachmentUrl } = body;

        if (!type || !startDate || !endDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Find the employee ID for the current user
        const employee = await prisma.employee.findUnique({
            where: {
                userId: session.user.id
            }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                employeeId: employee.id,
                type: type as LeaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason: reason || null,
                attachmentUrl: attachmentUrl || null,
            }
        });

        return NextResponse.json(leaveRequest, { status: 201 });
    } catch (err: any) {
        console.error("Leave Create Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
