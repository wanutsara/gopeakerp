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

        // 2. Determine existing payrolls for this month to avoid duplicates
        const existingPayrolls = await prisma.payroll.findMany({
            where: { month }
        });
        const existingEmployeeIds = existingPayrolls.map(p => p.employeeId);

        const newPayrollsToCreate = [];

        for (const emp of activeEmployees) {
            if (!existingEmployeeIds.includes(emp.id)) {
                // Calculate base logic. In a real system, you'd calculate deductions from Leaves/Attendance.
                // For now, we take `wageRate` as base monthly salary.
                const baseSalary = emp.employeeType === 'MONTHLY' ? emp.wageRate : (emp.wageRate * 22);

                newPayrollsToCreate.push({
                    employeeId: emp.id,
                    month,
                    baseSalary,
                    otAmount: 0,
                    bonus: 0,
                    deductions: 0,
                    netSalary: baseSalary,
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
