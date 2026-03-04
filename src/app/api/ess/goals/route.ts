import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 400 });
        }

        const goals = await prisma.employeeGoal.findMany({
            where: { employeeId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(goals);
    } catch (error) {
        console.error("Error fetching employee goals:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
