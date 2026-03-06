import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // 1. Workforce & Headcount
        const totalHeadcount = await prisma.employee.count();

        // Department Breakdown with Financials
        const departments = await prisma.department.findMany({
            include: {
                employees: {
                    include: {
                        payrolls: {
                            where: { month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
                        },
                        requests: {
                            where: {
                                status: 'APPROVED',
                                createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                            }
                        }
                    }
                }
            }
        });

        const departmentData = departments.map(d => {
            const totalSalary = d.employees.reduce((sum: number, emp: any) =>
                sum + emp.payrolls.reduce((pSum: number, p: any) => pSum + p.netSalary, 0), 0
            );
            const totalExpense = d.employees.reduce((sum: number, emp: any) =>
                sum + emp.requests.reduce((eSum: number, e: any) => eSum + e.amount, 0), 0
            );
            return {
                name: d.name,
                count: d.employees.length,
                totalSalary,
                totalExpense,
                totalSpend: totalSalary + totalExpense
            };
        });

        // 2. Revenue per Employee (The 10X Metric)
        const currentMonthOrders = await prisma.order.aggregate({
            where: { createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
            _sum: { total: true }
        }).catch(() => null);

        // Fallback to Customer totalSpent if Order aggregation fails (depending on exact schema)
        let totalRevenue = currentMonthOrders?._sum?.total || 0;
        if (totalRevenue === 0) {
            const allCustomers = await prisma.customer.aggregate({
                _sum: { totalSpent: true }
            });
            totalRevenue = allCustomers._sum.totalSpent || 0;
            // Rough monthly estimate for fallback
            if (totalRevenue > 0) totalRevenue = totalRevenue / 12;
        }

        const revenuePerEmployee = totalHeadcount > 0 ? (totalRevenue / totalHeadcount) : 0;

        // 3. Payroll Burn Rate
        const currentPayroll = await prisma.payroll.aggregate({
            where: { month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` },
            _sum: { netSalary: true, otAmount: true }
        });
        const totalPayroll = currentPayroll._sum.netSalary || 0;
        const totalOT = currentPayroll._sum.otAmount || 0;

        // 4. Cultural Pulse & Burnout Radar (Flight Risk)
        // High OT in the last 30 days
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const burnoutAlerts = await prisma.employee.findMany({
            where: {
                overtimeRequests: {
                    some: { createdAt: { gte: thirtyDaysAgo }, status: 'APPROVED' }
                }
            },
            select: {
                id: true,
                user: { select: { name: true } },
                position: true,
                department: { select: { name: true } },
                overtimeRequests: {
                    where: { createdAt: { gte: thirtyDaysAgo }, status: 'APPROVED' },
                    select: { calculatedHours: true }
                }
            }
        });

        const flightRiskData = burnoutAlerts.map(emp => {
            const totalHours = emp.overtimeRequests.reduce((sum, req) => sum + req.calculatedHours, 0);
            return {
                id: emp.id,
                name: emp.user?.name || emp.position,
                department: emp.department?.name || 'Unassigned',
                otHours: totalHours,
                riskLevel: totalHours > 20 ? 'CRITICAL' : (totalHours > 10 ? 'HIGH' : 'MEDIUM')
            };
        }).filter(e => e.otHours >= 10).sort((a, b) => b.otHours - a.otHours);


        // 5. Talent Velocity (Quest Completion Rate)
        const quests = await prisma.quest.aggregate({
            where: { createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
            _count: { _all: true }
        });

        const completedQuests = await prisma.quest.aggregate({
            where: {
                createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                status: 'COMPLETED'
            },
            _count: { _all: true }
        });

        const questVelocity = quests._count._all > 0
            ? Math.round((completedQuests._count._all / quests._count._all) * 100)
            : 0;

        // 6. Real-Time TimeLog (Attendance Today)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todaysLogs = await prisma.timeLog.count({
            where: { checkInTime: { gte: startOfDay } }
        });

        const attendanceRate = totalHeadcount > 0 ? Math.round((todaysLogs / totalHeadcount) * 100) : 0;

        return NextResponse.json({
            headcount: totalHeadcount,
            departments: departmentData,
            revenuePerEmployee,
            totalPayroll,
            totalOT,
            questVelocity,
            attendanceRate,
            activeEmployeesToday: todaysLogs,
            flightRisks: flightRiskData
        });

    } catch (error) {
        console.error("HR Analytics Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
