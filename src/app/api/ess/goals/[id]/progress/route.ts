import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const body = await request.json();
        const { currentValue } = body;

        if (currentValue === undefined) {
            return NextResponse.json({ error: "Missing currentValue" }, { status: 400 });
        }

        const { id } = await params;

        // Verify the goal is owned by this employee
        const existingGoal = await prisma.employeeGoal.findUnique({
            where: { id: id }
        });

        if (!existingGoal || existingGoal.employeeId !== employee.id) {
            return NextResponse.json({ error: "Goal not found or unauthorized" }, { status: 404 });
        }

        // Update progress
        let status = existingGoal.status;
        if (parseFloat(currentValue) >= existingGoal.targetValue) {
            status = "ACHIEVED";
        } else {
            status = "IN_PROGRESS";
        }

        const updatedGoal = await prisma.employeeGoal.update({
            where: { id: id },
            data: {
                currentValue: parseFloat(currentValue),
                status
            }
        });

        // Notify HR or Manager that employee updated goal? (Optional, maybe too spammy. Will skip for now but we could add it)

        return NextResponse.json(updatedGoal);

    } catch (error) {
        console.error("Error updating goal progress:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
