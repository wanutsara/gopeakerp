import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        // Retrieve Employee bound to User Session
        const employee = await prisma.employee.findFirst({
            where: { user: { email: session.user.email! } },
            include: { companyBrand: true, user: true }
        });

        if (!employee) {
            return new NextResponse("Employee profile not found", { status: 404 });
        }

        // Fetch Historical Payroll Slips sorted strictly descending
        const payrolls = await prisma.payroll.findMany({
            where: { employeeId: employee.id },
            orderBy: { month: 'desc' }
        });

        // Compute Year-To-Date (YTD) Statistics
        let ytdGross = 0;
        let ytdNet = 0;
        let ytdTax = 0;
        let ytdSso = 0;

        // E.g. month string "2024-03" -> process only current Year
        const currentYear = new Date().getFullYear().toString();

        payrolls.forEach(slip => {
            if (slip.month.startsWith(currentYear)) {
                // Gross = Base + Bonus + OT + Other Income
                const gross = slip.baseSalary + slip.bonus + slip.otAmount + slip.otherIncome;
                ytdGross += gross;
                ytdNet += slip.netSalary;
                ytdTax += slip.taxDeduction;
                ytdSso += slip.socialSecurityDeduction;
            }
        });

        return NextResponse.json({
            employee: {
                name: employee.user?.name || 'Employee',
                level: employee.level,
                currentExp: employee.exp,
                brand: employee.companyBrand,
                hireDate: employee.startDate,
            },
            payrolls,
            ytd: {
                gross: ytdGross,
                net: ytdNet,
                tax: ytdTax,
                sso: ytdSso,
                year: currentYear
            }
        });

    } catch (error) {
        console.error("ESS Payroll GET Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
