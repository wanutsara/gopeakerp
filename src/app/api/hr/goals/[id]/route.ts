import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requirePermission("HR", "WRITE");
        const { id } = await params;
        const body = await request.json();

        const { currentValue, status } = body;

        const updatedGoal = await prisma.employeeGoal.update({
            where: { id },
            data: {
                currentValue: currentValue !== undefined ? parseFloat(currentValue) : undefined,
                status: status || undefined
            }
        });

        // Check if just met goal
        if (updatedGoal.currentValue >= updatedGoal.targetValue && updatedGoal.status !== "ACHIEVED") {
            await prisma.employeeGoal.update({
                where: { id },
                data: { status: "ACHIEVED" }
            });

            // Notify Employee
            const employee = await prisma.employee.findUnique({ where: { id: updatedGoal.employeeId } });
            if (employee) {
                await prisma.notification.create({
                    data: {
                        userId: employee.userId,
                        title: `🏅 ยินดีด้วย! บรรลุเป้าหมายแล้ว`,
                        message: `เป้าหมาย "${updatedGoal.title}" ของคุณสำเร็จลุล่วงแล้ว!`,
                        type: "SYSTEM"
                    }
                });
            }
        }

        return NextResponse.json(updatedGoal);
    } catch (error) {
        console.error("Error updating goal:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requirePermission("HR", "WRITE");
        const { id } = await params;

        await prisma.employeeGoal.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting goal:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
