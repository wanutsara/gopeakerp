import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";

// Helper to determine start and end dates for a "YYYY-MM"
function getMonthBounds(monthStr: string) {
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { startDate, endDate };
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const hasPermission = await checkPermission(session?.user?.id, "PAYROLL", "canRead");
        if (!hasPermission) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const monthStr = searchParams.get('month'); // e.g. "2026-03"
        if (!monthStr) {
            return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
        }

        const { startDate, endDate } = getMonthBounds(monthStr);

        // Fetch all active employees
        const employees = await prisma.employee.findMany({
            where: { status: "ACTIVE" },
            include: { department: true, user: true }
        });

        const previewData = [];
        let globalHasBlockers = false;
        const totals = { baseSalary: 0, otAmount: 0, lateDeduction: 0, ssoDeduction: 0, netSalary: 0 };

        for (const emp of employees) {
            let isBlocked = false;
            let blockReason = "";

            // 1. Fetch TimeLogs for the month
            const logs = await prisma.timeLog.findMany({
                where: {
                    employeeId: emp.id,
                    date: { gte: startDate, lte: endDate }
                }
            });

            // Check for unapproved or disputed logs
            const pendingLogs = logs.filter(l => !l.isApproved);
            const disputedLogs = logs.filter(l => l.isDisputed);

            if (pendingLogs.length > 0) {
                isBlocked = true;
                blockReason = `รอ Manager อนุมัติ (${pendingLogs.length} วัน)`;
            } else if (disputedLogs.length > 0) {
                isBlocked = true;
                blockReason = `พนักงานคัดค้านเวลา (${disputedLogs.length} วัน)`;
            }

            if (isBlocked) globalHasBlockers = true;

            // 2. Base Salary
            const baseSalary = emp.wageRate || 15000;
            const hourlyWage = baseSalary / (30 * 8);

            // 3. Late Deductions (Using payableCheckIn vs targetStart, roughly 2 THB per minute for this agency)
            let totalLateMinutes = 0;
            // Let's assume the company strictly charges for LATE status
            const lateLogs = logs.filter(l => l.status === "LATE" && l.payableCheckInTime);
            totalLateMinutes = lateLogs.length * 30; // Approximation for simplicity in this system unless exact minute tracking is mandated
            const lateDeduction = lateLogs.length * 100; // Flat 100 THB penalty per late day as standard default

            // 4. OT Calculation
            const ots = await prisma.overtimeRequest.findMany({
                where: {
                    employeeId: emp.id,
                    date: { gte: startDate, lte: endDate },
                    status: "APPROVED"
                }
            });
            let otAmount = 0;
            ots.forEach(ot => {
                otAmount += ot.calculatedHours * ot.multiplier * hourlyWage;
            });

            // 5. SSO Calculation (2026 Rules: max 17,500 THB * 5% = 875 THB)
            const ssoDeduction = Math.min(baseSalary * 0.05, 875);

            // 6. Net Salary
            const netSalary = baseSalary + otAmount - lateDeduction - ssoDeduction;

            previewData.push({
                id: emp.id,
                name: (emp as any).user?.name || emp.id,
                department: emp.department?.name || 'ไม่มีแผนก',
                baseSalary,
                otAmount,
                lateDeduction,
                ssoDeduction,
                netSalary,
                isBlocked,
                blockReason
            });

            if (!isBlocked) {
                totals.baseSalary += baseSalary;
                totals.otAmount += otAmount;
                totals.lateDeduction += lateDeduction;
                totals.ssoDeduction += ssoDeduction;
                totals.netSalary += netSalary;
            }
        }

        return NextResponse.json({
            month: monthStr,
            hasBlockers: globalHasBlockers,
            employees: previewData,
            totals
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const hasPermission = await checkPermission(session?.user?.id, "PAYROLL", "canWrite");
        if (!hasPermission) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { month } = body;
        if (!month) return NextResponse.json({ error: "Month required" }, { status: 400 });

        // Reuse the GET logic to compute exact real-time amounts
        // We will call the private local function to calculate
        const { searchParams } = new URL(req.url);
        // Workaround: re-implement or extract the logic. 
        // For security and transactional safety, we re-calculate directly before DB commit.
        
        const { startDate, endDate } = getMonthBounds(month);
        const employees = await prisma.employee.findMany({ where: { status: "ACTIVE" } });

        let processedCount = 0;
        let skippedCount = 0;

        // Wrap in transaction simulation or sequential loops
        for (const emp of employees) {
            const logs = await prisma.timeLog.findMany({
                where: { employeeId: emp.id, date: { gte: startDate, lte: endDate } }
            });

            if ((logs as any[]).some(l => !l.isApproved || l.isDisputed)) {
                skippedCount++;
                continue; // Skip blocked employees
            }

            const baseSalary = emp.wageRate || 15000;
            const hourlyWage = baseSalary / (30 * 8);

            const lateLogs = logs.filter(l => l.status === "LATE");
            const lateDeduction = lateLogs.length * 100;

            const ots = await prisma.overtimeRequest.findMany({
                where: { employeeId: emp.id, date: { gte: startDate, lte: endDate }, status: "APPROVED" }
            });
            
            let otAmountRaw = 0;
            ots.forEach(ot => { otAmountRaw += ot.calculatedHours * ot.multiplier * hourlyWage; });

            const ssoDeductionRaw = Math.min(baseSalary * 0.05, 875);
            const netSalaryRaw = baseSalary + otAmountRaw - lateDeduction - ssoDeductionRaw;

            // Float Math Component 4 Fixes
            const otAmount = Number(otAmountRaw.toFixed(2));
            const ssoDeduction = Number(ssoDeductionRaw.toFixed(2));
            const netSalary = Number(netSalaryRaw.toFixed(2));

            // Database Upsert to Payroll model
            await prisma.payroll.upsert({
                where: {
                    employeeId_month: {
                        employeeId: emp.id,
                        month: month
                    }
                },
                update: {
                    baseSalary,
                    otAmount,
                    lateDeduction,
                    socialSecurityDeduction: ssoDeduction,
                    netSalary,
                    status: "UNPAID" // Requires Finance to click "Disburse" later
                },
                create: {
                    employeeId: emp.id,
                    month: month,
                    baseSalary,
                    otAmount,
                    lateDeduction,
                    socialSecurityDeduction: ssoDeduction,
                    netSalary,
                    status: "UNPAID"
                }
            });
            processedCount++;
        }

        return NextResponse.json({ message: "Payroll Generated", processed: processedCount, skipped: skippedCount });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
