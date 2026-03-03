import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action } = body; // "CHECK_IN" or "CHECK_OUT"

        if (!action || (action !== "CHECK_IN" && action !== "CHECK_OUT")) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const employee = await prisma.employee.findUnique({
            where: {
                userId: session.user.id
            }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }

        const today = new Date();
        // Reset time to start of day for searching
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        let attendance = await prisma.attendance.findFirst({
            where: {
                employeeId: employee.id,
                date: {
                    gte: startOfDay,
                }
            }
        });

        if (action === "CHECK_IN") {
            if (attendance) {
                return NextResponse.json({ error: "Already checked in today" }, { status: 400 });
            }
            attendance = await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: startOfDay,
                    checkIn: today,
                }
            });
        } else if (action === "CHECK_OUT") {
            if (!attendance) {
                return NextResponse.json({ error: "No check-in record found for today" }, { status: 400 });
            }
            if (attendance.checkOut) {
                return NextResponse.json({ error: "Already checked out today" }, { status: 400 });
            }

            // Calculate hours worked
            const checkInTime = new Date(attendance.checkIn!).getTime();
            const checkOutTime = today.getTime();
            const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOut: today,
                    hoursWorked: hoursWorked
                }
            });
        }

        return NextResponse.json(attendance, { status: 200 });
    } catch (err: any) {
        console.error("Attendance Action Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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
            return NextResponse.json({ error: "Employee found" }, { status: 404 });
        }

        const logs = await prisma.attendance.findMany({
            where: { employeeId: employee.id },
            orderBy: { date: "desc" },
            take: 30
        });

        return NextResponse.json(logs, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
