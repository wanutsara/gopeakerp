import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hasPermission = await checkPermission(session.user.id, "EMPLOYEES", "canWrite");
        if (!hasPermission) {
            return NextResponse.json({ error: "Forbidden: managing leave quotas requires EMPLOYEES write access." }, { status: 403 });
        }

        const body = await request.json();
        const { employeeId, year, sickLeaveTotal, personalLeaveTotal, vacationTotal } = body;

        if (!employeeId || !year) {
            return NextResponse.json({ error: "Missing required fields: employeeId, year" }, { status: 400 });
        }

        // Only overwrite quota fields that were actually supplied, so a partial
        // update can't silently zero the employee's other existing quotas.
        const updateData: { sickLeaveTotal?: number; personalLeaveTotal?: number; vacationTotal?: number } = {};
        if (sickLeaveTotal !== undefined) updateData.sickLeaveTotal = parseFloat(sickLeaveTotal) || 0;
        if (personalLeaveTotal !== undefined) updateData.personalLeaveTotal = parseFloat(personalLeaveTotal) || 0;
        if (vacationTotal !== undefined) updateData.vacationTotal = parseFloat(vacationTotal) || 0;

        // Upsert the leave balance for the given employee and year
        const leaveBalance = await prisma.leaveBalance.upsert({
            where: {
                employeeId_year: {
                    employeeId,
                    year,
                }
            },
            update: updateData,
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
