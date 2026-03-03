import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, role, employeeType, position, wageRate, status, bankAccount, departmentId } = body;

        // Transaction to update both employee and user
        const updatedEmployee = await prisma.$transaction(async (tx) => {
            const emp = await tx.employee.update({
                where: { id },
                data: {
                    employeeType,
                    position,
                    wageRate: parseFloat(wageRate) || 0,
                    status,
                    bankAccount,
                    departmentId: departmentId || null,
                },
                include: { user: true },
            });

            if (name || role) {
                await tx.user.update({
                    where: { id: emp.userId },
                    data: {
                        name: name || emp.user.name,
                        role: role || emp.user.role,
                    },
                });
            }

            // Log activity
            await tx.activityLog.create({
                data: {
                    action: "UPDATE",
                    entity: "EMPLOYEE",
                    entityId: emp.id,
                    details: `Updated employee: ${name || emp.user.name}`,
                }
            });

            return emp;
        });

        return NextResponse.json(updatedEmployee);
    } catch (error) {
        console.error("Error updating employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // Need to find user id first
        const emp = await prisma.employee.findUnique({
            where: { id },
        });

        if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Delete user will cascade delete employee
        await prisma.user.delete({
            where: { id: emp.userId },
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                action: "DELETE",
                entity: "EMPLOYEE",
                entityId: id,
                details: `Deleted employee record`,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
