import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        // 1. Target subsidiaries to allocate cost to
        const subsidiaries = await prisma.companyBrand.findMany({
            where: { isHQ: false },
            orderBy: { name: 'asc' }
        });

        // 2. Fetch shared service (HQ) employees
        const hqEmployees = await prisma.employee.findMany({
            where: { companyBrand: { isHQ: true }, status: 'ACTIVE' },
            include: { user: true, department: true },
            orderBy: { wageRate: 'desc' }
        });

        return NextResponse.json({ subsidiaries, hqEmployees });
    } catch (error) {
        console.error("Payroll Allocation GET Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        // Expected format: { allocations: [{ employeeId: string, mapping: Record<string, number> }] }

        const updates = body.allocations.map((a: any) =>
            prisma.employee.update({
                where: { id: a.employeeId },
                data: { payrollAllocation: a.mapping }
            })
        );

        // Bulk apply execution via transactional boundary
        await prisma.$transaction(updates);

        return NextResponse.json({ status: "success", applied: updates.length });
    } catch (error) {
        console.error("Payroll Allocation POST Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
