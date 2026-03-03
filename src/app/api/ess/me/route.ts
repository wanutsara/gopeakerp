import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findFirst({
            where: { user: { email: session.user.email } },
            include: {
                user: true,
                department: true,
                manager: { include: { user: true } }
            }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }

        // Get today's attendance log
        const now = new Date();
        const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

        const todayLog = await prisma.timeLog.findUnique({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date: todayUtc
                }
            }
        });

        return NextResponse.json({
            employee,
            todayLog
        });
    } catch (error) {
        console.error("Error fetching portal me:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
