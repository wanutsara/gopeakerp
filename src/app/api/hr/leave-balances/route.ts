import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { employeeId, year, sickLeaveTotal, personalLeaveTotal, vacationTotal } = body;

        if (!employeeId || !year) {
            return NextResponse.json({ error: "Missing required fields: employeeId, year" }, { status: 400 });
        }

        // Upsert the leave balance for the given employee and year
        const leaveBalance = await prisma.leaveBalance.upsert({
            where: {
                employeeId_year: {
                    employeeId,
                    year,
                }
            },
            update: {
                sickLeaveTotal: parseFloat(sickLeaveTotal) || 0,
                personalLeaveTotal: parseFloat(personalLeaveTotal) || 0,
                vacationTotal: parseFloat(vacationTotal) || 0,
            },
            create: {
                employeeId,
                year,
                sickLeaveTotal: parseFloat(sickLeaveTotal) || 30,
                personalLeaveTotal: parseFloat(personalLeaveTotal) || 6,
                vacationTotal: parseFloat(vacationTotal) || 6,
            }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                action: "UPDATE",
                entity: "LEAVE_BALANCE",
                entityId: leaveBalance.id,
                details: `Updated leave quota for employee ${employeeId} year ${year}`,
            }
        });

        return NextResponse.json(leaveBalance);
    } catch (error) {
        console.error("Error upserting leave balance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
