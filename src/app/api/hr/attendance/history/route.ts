import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const startParam = searchParams.get('startDate');
        const endParam = searchParams.get('endDate');

        if (!startParam || !endParam) {
            return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
        }

        const startDate = new Date(startParam);
        const endDate = new Date(endParam);

        // Fetch all active employees
        const employees = await prisma.employee.findMany({
            where: { status: "ACTIVE" },
            include: { department: true }
        });

        // Fetch all TimeLogs in date range
        const timeLogs = await prisma.timeLog.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                employee: { include: { department: true } },
                auditLogs: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        // Fetch all approved Leaves overlapping date range
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                status: "APPROVED",
                AND: [
                    { startDate: { lte: endDate } },
                    { endDate: { gte: startDate } }
                ]
            }
        });

        // Fetch all Company Holidays in date range
        const holidays = await prisma.companyHoliday.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Holiday Map
        const holidayMap = new Map();
        holidays.forEach((h: any) => {
            const dateStr = h.date.toISOString().split('T')[0];
            holidayMap.set(dateStr, h);
        });

        // Leave Map: "employeeId_dateStr"
        const leaveMap = new Map();
        leaves.forEach((l: any) => {
            let sDate = new Date(l.startDate);
            let eDate = new Date(l.endDate);
            sDate = new Date(Date.UTC(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()));
            eDate = new Date(Date.UTC(eDate.getFullYear(), eDate.getMonth(), eDate.getDate()));
            
            let cur = new Date(sDate);
            while(cur <= eDate) {
                const dateStr = cur.toISOString().split('T')[0];
                leaveMap.set(`${l.employeeId}_${dateStr}`, l);
                cur.setDate(cur.getDate() + 1);
            }
        });

        // Create a map for fast lookup: "employeeId_UTCdate"
        const logMap = new Map();
        timeLogs.forEach(log => {
            const dateStr = log.date.toISOString().split('T')[0];
            logMap.set(`${log.employeeId}_${dateStr}`, log);
        });

        // Generate the Timesheets Matrix (including Missing/Ghost shifts)
        const timesheetMatrix: any[] = [];
        
        // Loop through each day
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const utcDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));

            // For each employee on this day
            employees.forEach(emp => {
                const logExists = logMap.has(`${emp.id}_${dateStr}`);
                
                if (logExists) {
                    timesheetMatrix.push({
                        ...logMap.get(`${emp.id}_${dateStr}`),
                        isGhost: false,
                        logicalDate: dateStr
                    });
                } else {
                    // Check if employee started AFTER this date, if so, skip them
                    if (emp.startDate && new Date(emp.startDate) > utcDate) {
                        return; // Skip ghost row for employees before they joined
                    }

                    const isHoliday = holidayMap.has(dateStr);
                    const isLeave = leaveMap.has(`${emp.id}_${dateStr}`);

                    let ghostStatus = "NO_SHOW";
                    let ghostReason = null;

                    if (isHoliday) {
                        ghostStatus = "HOLIDAY";
                        ghostReason = holidayMap.get(dateStr).name;
                    } else if (isLeave) {
                        ghostStatus = "ON_LEAVE";
                        const lv = leaveMap.get(`${emp.id}_${dateStr}`);
                        ghostReason = lv.type + (lv.reason ? ` - ${lv.reason}` : "");
                    }

                    // Ghost Row (No-Show, Holiday, or Leave)
                    timesheetMatrix.push({
                        id: `ghost_${emp.id}_${dateStr}`,
                        employeeId: emp.id,
                        employee: emp,
                        date: utcDate,
                        logicalDate: dateStr,
                        checkInTime: null,
                        checkOutTime: null,
                        payableCheckInTime: null,
                        payableCheckOutTime: null,
                        status: ghostStatus,
                        ghostReason: ghostReason,
                        isGhost: true,
                        isOverridden: false,
                        auditLogs: []
                    });
                }
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return NextResponse.json({ timesheets: timesheetMatrix });

    } catch (error: any) {
        console.error("Timesheet History API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
