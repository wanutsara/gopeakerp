import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
    try {
        await requirePermission("HR", "READ");
        const url = new URL(request.url);
        const employeeId = url.searchParams.get("employeeId");

        const goals = await prisma.employeeGoal.findMany({
            where: employeeId ? { employeeId } : undefined,
            include: {
                employee: { select: { id: true, user: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(goals);
    } catch (error) {
        console.error("Error fetching goals:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await requirePermission("HR", "WRITE");
        const body = await request.json();
        const { employeeId, title, description, targetValue, unit, deadline } = body;

        if (!employeeId || !title || targetValue === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newGoal = await prisma.employeeGoal.create({
            data: {
                employeeId,
                title,
                description,
                targetValue: parseFloat(targetValue),
                currentValue: 0,
                unit: unit || "%",
                deadline: deadline ? new Date(deadline) : null,
                status: "IN_PROGRESS"
            }
        });

        // Notify employee
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (employee) {
            await prisma.notification.create({
                data: {
                    userId: employee.userId,
                    title: `🎯 เป้าหมายใหม่: ${title}`,
                    message: `HR ได้ตั้งเป้าหมาย หรือ KPI ใหม่ให้คุณ เข้าไปดูรายละเอียดได้เลย`,
                    type: "SYSTEM"
                }
            });
        }

        revalidatePath("/hr");
        revalidatePath("/hr/goals");

        return NextResponse.json(newGoal, { status: 201 });
    } catch (error) {
        console.error("Error creating goal:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
