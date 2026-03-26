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

        // 2. Get Company Global Settings for Logical Cutoff
        const companySetting = await prisma.companySetting.findFirst();
        const targetCutoff = employee.customLogicalCutoff ?? employee.department?.logicalCutoff ?? companySetting?.defaultLogicalCutoff ?? "04:00";

        // Get today's attendance log based on Logical Day
        const now = new Date();
        const [cutoffHH, cutoffMM] = targetCutoff.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        let logicalDate = new Date(now);
        if (currentHour < cutoffHH || (currentHour === cutoffHH && currentMinute < cutoffMM)) {
            logicalDate.setDate(logicalDate.getDate() - 1);
        }

        const todayUtc = new Date(Date.UTC(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate()));

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
