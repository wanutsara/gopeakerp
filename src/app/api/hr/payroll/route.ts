import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateThaiSSO, calculateThaiPND1, TaxDeductions } from "@/lib/tax"; // Phase 49B Engine

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const month = searchParams.get('month'); // e.g. "2026-03"

        const whereClause = month ? { month } : {};

        const payrolls = await prisma.payroll.findMany({
            where: whereClause,
            include: {
                employee: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: {
                month: 'desc'
            }
        });

        return NextResponse.json(payrolls);
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

        // Only OWNER or MANAGER can generate payrolls
        if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { month } = body;

        if (!month) {
            return NextResponse.json({ error: "Missing month (YYYY-MM)" }, { status: 400 });
        }

        // 1. Get all active employees
        const activeEmployees = await prisma.employee.findMany({
            where: {
                status: "ACTIVE"
            }
        });

        const startDate = new Date(`${body.month}-01T00:00:00.000Z`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        // Fetch all attendance for this month to count exact working days for DAILY employees
        const monthAttendances = await prisma.attendance.findMany({
            where: {
                date: { gte: startDate, lt: endDate },
                checkIn: { not: null }
            }
        });

        // 2. Determine existing payrolls for this month to avoid duplicates
        const existingPayrolls = await prisma.payroll.findMany({
            where: { month }
        });
        const existingEmployeeIds = existingPayrolls.map(p => p.employeeId);

        const newPayrollsToCreate = [];
        const payrollYear = parseInt(month.split('-')[0]);
        const payrollDate = new Date(`${month}-28`); // Estimate end of month for calculations

        for (const emp of activeEmployees) {
            if (!existingEmployeeIds.includes(emp.id)) {
                // 1. Base Salary Engine
                let baseSalary = 0;
                let daysWorked = 0;

                if (emp.employeeType === 'MONTHLY') {
                    baseSalary = emp.wageRate;
                } else {
                    // Filter this specific employee's attendance
                    const empAttendance = monthAttendances.filter(a => a.employeeId === emp.id);
                    // De-duplicate attendances by day to prevent double-counting if they check-in twice a day
                    const uniqueDays = new Set(empAttendance.map(a => a.date.toISOString().split('T')[0]));
                    daysWorked = uniqueDays.size;

                    baseSalary = emp.wageRate * daysWorked;
                }

                // 2. Fetch Year-to-Date (YTD) aggregates for PND.1 progressive taxation
                const ytdPayrolls = await prisma.payroll.findMany({
                    where: { employeeId: emp.id, month: { startsWith: `${payrollYear}-` } }
                });
                const ytdIncome = ytdPayrolls.reduce((sum, p) => sum + p.baseSalary + p.otAmount + p.otherIncome, 0);
                const ytdTax = ytdPayrolls.reduce((sum, p) => sum + p.taxDeduction, 0);

                // 3. Dynamic Date-Aware SSO matching (Handles 2026 cap increases)
                let socialSecurityDeduction = 0;
                let ssoEmployerContribution = 0;
                if (emp.employeeType === 'MONTHLY' && baseSalary >= 1650) {
                    socialSecurityDeduction = calculateThaiSSO(baseSalary, payrollDate);
                    ssoEmployerContribution = socialSecurityDeduction; // Employer matches 1:1
                }

                // 4. Overtime (Taxable but NON-SSO)
                const otRequests = await prisma.overtimeRequest.findMany({
                    where: { employeeId: emp.id, status: "APPROVED", date: { gte: startDate, lt: endDate } }
                });

                const hourlyWage = emp.employeeType === 'MONTHLY' ? (emp.wageRate / 30 / 8) : (emp.wageRate / 8);
                let otAmount = 0;
                for (const ot of otRequests) { otAmount += (ot.calculatedHours * ot.multiplier * hourlyWage); }
                otAmount = Math.round(otAmount);

                // 5. Calculate PND.1 using the Enterprise Engine
                const parsedDeductions = emp.taxDeductions ? (emp.taxDeductions as unknown as TaxDeductions) : {};
                // Inject the auto-calculated SSO into the deduction profile
                parsedDeductions.socialSecurityTotal = (ytdPayrolls.reduce((s, p) => s + p.socialSecurityDeduction, 0)) + socialSecurityDeduction;

                const taxDeduction = calculateThaiPND1(
                    baseSalary,
                    otAmount,
                    parsedDeductions,
                    payrollDate,
                    ytdIncome,
                    ytdTax,
                    13 - (payrollDate.getMonth() + 1)
                );

                // 6. Student Loan (กยศ.) & Deductions
                const studentLoan = emp.studentLoanDeduction || 0;
                const totalDeductions = socialSecurityDeduction + taxDeduction + studentLoan;

                // 7. Net Salary
                const netSalary = (baseSalary + otAmount) - totalDeductions;

                // Sanitization guard against NaN
                const safeBaseSalary = Number.isNaN(baseSalary) ? 0 : baseSalary;
                const safeOtAmount = Number.isNaN(otAmount) ? 0 : otAmount;
                const safeSocialSecurityDeduction = Number.isNaN(socialSecurityDeduction) ? 0 : socialSecurityDeduction;
                const safeSsoEmployerContribution = Number.isNaN(ssoEmployerContribution) ? 0 : ssoEmployerContribution;
                const safeTaxDeduction = Number.isNaN(taxDeduction) ? 0 : taxDeduction;
                const safeStudentLoan = Number.isNaN(studentLoan) ? 0 : studentLoan;
                const safeYtdIncome = Number.isNaN(ytdIncome) ? 0 : ytdIncome;
                const safeYtdTax = Number.isNaN(ytdTax) ? 0 : ytdTax;
                const safeNetSalary = Number.isNaN(netSalary) ? 0 : netSalary;

                newPayrollsToCreate.push({
                    employeeId: emp.id,
                    month,
                    baseSalary: safeBaseSalary,
                    otAmount: safeOtAmount, // In Prisma, otAmount represents the total OT pay
                    overtimePay: safeOtAmount, // Separate field for pure OT
                    allowanceTaxFree: 0,
                    otherIncome: 0,
                    bonus: 0,
                    socialSecurityDeduction: safeSocialSecurityDeduction,
                    ssoEmployerContribution: safeSsoEmployerContribution,
                    taxDeduction: safeTaxDeduction,
                    deductions: safeStudentLoan, // Mapping remaining general deductions config to student loan temporarily
                    ytdIncome: safeYtdIncome + safeBaseSalary + safeOtAmount,
                    ytdTax: safeYtdTax + safeTaxDeduction,
                    lateDeduction: 0,
                    netSalary: safeNetSalary,
                    status: "UNPAID" as const
                });
            }
        }

        if (newPayrollsToCreate.length > 0) {
            await prisma.payroll.createMany({
                data: newPayrollsToCreate
            });
        }

        // Return the updated list covering everything in the month mapping
        const allMonthPayrolls = await prisma.payroll.findMany({
            where: { month },
            include: {
                employee: {
                    include: {
                        user: true
                    }
                }
            }
        });

        return NextResponse.json({ message: "Generated successfully", generatedCount: newPayrollsToCreate.length, payrolls: allMonthPayrolls }, { status: 201 });
    } catch (err: any) {
        console.error("Payroll Generation Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
