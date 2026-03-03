import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            include: { user: true },
            orderBy: { user: { name: 'asc' } }
        });
        return NextResponse.json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password, role, employeeType, position, wageRate, status, bankAccount, image, departmentId } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Missing required user fields" }, { status: 400 });
        }

        // 1. Create User
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Wrap in transaction
        const employee = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: role || "STAFF",
                },
            });

            const emp = await tx.employee.create({
                data: {
                    userId: user.id,
                    employeeType: employeeType || "MONTHLY",
                    position: position || "",
                    wageRate: parseFloat(wageRate) || 0,
                    status: status || "ACTIVE",
                    bankAccount: bankAccount || "",
                    image: image || null,
                    departmentId: departmentId || null,
                    startDate: new Date(),
                },
                include: {
                    user: true,
                    department: true
                },
            });

            // Log activity
            await tx.activityLog.create({
                data: {
                    action: "CREATE",
                    entity: "EMPLOYEE",
                    entityId: emp.id,
                    details: `Created new employee: ${user.name}`,
                }
            });

            return emp;
        });

        return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
        console.error("Error creating employee:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
