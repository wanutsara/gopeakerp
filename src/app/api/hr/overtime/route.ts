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

        const userRole = session.user.role;
        const userId = session.user.id;

        // Ensure user is authorized
        if (userRole !== "OWNER" && userRole !== "MANAGER" && userRole !== "HR") {
            // For standard employees just redirect them gracefully
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const requests = await prisma.overtimeRequest.findMany({
            include: {
                employee: {
                    include: {
                        user: true,
                        department: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(requests);
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
        const { employeeId, date, startTime, endTime, calculatedHours, multiplier, reason } = body;

        if (!employeeId || !date || !startTime || !endTime || calculatedHours === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newOT = await prisma.overtimeRequest.create({
            data: {
                employeeId,
                date: new Date(date),
                startTime,
                endTime,
                calculatedHours: parseFloat(calculatedHours),
                multiplier: parseFloat(multiplier || "1.5"),
                reason: reason || null,
                status: "APPROVED", // Auto-approve if created by HR/Manager
                approvedBy: session.user.id
            }
        });

        return NextResponse.json(newOT, { status: 201 });
    } catch (err: any) {
        console.error("OT Create Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
