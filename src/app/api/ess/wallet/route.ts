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

        // Find the employee profile of the logged-in user
        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }

        // Fetch their historical payslips
        const payrolls = await prisma.payroll.findMany({
            where: { employeeId: employee.id },
            orderBy: { month: 'desc' }
        });

        return NextResponse.json(payrolls);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
