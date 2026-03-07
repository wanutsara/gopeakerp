import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                user: true,
                department: true,
                leaveBalances: true,
                documents: true,
            }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        return NextResponse.json(employee);
    } catch (error) {
        console.error("Error fetching employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            name, email, role, userRoleId, password, employeeType, position, wageRate, status, bankAccount, departmentId, image,
            idCardNumber, dob, gender, address, emergencyContact, emergencyRelation,
            mbti, enneagram, tshirtSize, foodAllergies,
            startDate, probationEndDate, managerId, phoneNumber,
            customLat, customLng, customRadius, customWorkStart, customWorkEnd, companyBrandId
        } = body;

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
                    ...(companyBrandId !== undefined && { companyBrandId: companyBrandId || null }),
                    ...(image !== undefined && { image }),
                    ...(idCardNumber !== undefined && { idCardNumber }),
                    ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
                    ...(gender !== undefined && { gender }),
                    ...(address !== undefined && { address }),
                    ...(phoneNumber !== undefined && { phoneNumber }),
                    ...(emergencyContact !== undefined && { emergencyContact }),
                    ...(emergencyRelation !== undefined && { emergencyRelation }),
                    ...(mbti !== undefined && { mbti }),
                    ...(enneagram !== undefined && { enneagram }),
                    ...(tshirtSize !== undefined && { tshirtSize }),
                    ...(foodAllergies !== undefined && { foodAllergies }),
                    ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                    ...(probationEndDate !== undefined && { probationEndDate: probationEndDate ? new Date(probationEndDate) : null }),
                    ...(managerId !== undefined && { managerId: managerId || null }),
                    ...(customLat !== undefined && { customLat: customLat ? parseFloat(customLat) : null }),
                    ...(customLng !== undefined && { customLng: customLng ? parseFloat(customLng) : null }),
                    ...(customRadius !== undefined && { customRadius: customRadius ? parseFloat(customRadius) : null }),
                    ...(customWorkStart !== undefined && { customWorkStart: customWorkStart || null }),
                    ...(customWorkEnd !== undefined && { customWorkEnd: customWorkEnd || null }),
                },
                include: { user: true },
            });

            if (name !== undefined || email !== undefined || role !== undefined || userRoleId !== undefined || password) {
                let hashedPassword;
                if (password) {
                    hashedPassword = await bcrypt.hash(password, 10);
                }

                await tx.user.update({
                    where: { id: emp.userId },
                    data: {
                        ...(name !== undefined && { name }),
                        ...(email !== undefined && { email }),
                        ...(role !== undefined && { role }),
                        ...(userRoleId !== undefined && { userRoleId: userRoleId || null }),
                        ...(hashedPassword && { password: hashedPassword }),
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

        revalidatePath("/hr");
        revalidatePath("/hr/employees");

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

        revalidatePath("/hr");
        revalidatePath("/hr/employees");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
