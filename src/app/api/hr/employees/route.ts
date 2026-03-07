import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function GET() {
    try {
        await requirePermission("HR", "READ");
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
        await requirePermission("HR", "WRITE");
        const body = await request.json();
        const {
            name, email, password, role,
            employeeType, position, wageRate, status, bankAccount, image, departmentId,
            idCardNumber, dob, gender, address, emergencyContact, emergencyRelation,
            mbti, enneagram, tshirtSize, foodAllergies,
            startDate, probationEndDate, managerId, phoneNumber, companyBrandId
        } = body;

        if (!name || !email) {
            return NextResponse.json({ error: "Missing required user fields" }, { status: 400 });
        }

        // 1. Create User (Default password to 123456 if none provided)
        const passwordToHash = password || "123456";
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);

        // 2. Wrap in transaction
        const employee = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: role || "STAFF",
                    image: image || null,
                },
            });

            const emp = await tx.employee.create({
                data: {
                    userId: user.id,
                    employeeType: employeeType || "MONTHLY",
                    position: position || "",
                    wageRate: parseFloat(wageRate) || 0,
                    status: status || "ACTIVE",
                    bankAccount,
                    departmentId: departmentId || null,
                    companyBrandId: companyBrandId || null,
                    idCardNumber: idCardNumber ? idCardNumber : null,
                    dob: dob ? new Date(dob) : null,
                    gender: gender || null,
                    address: address || null,
                    phoneNumber: phoneNumber || null,
                    emergencyContact: emergencyContact || null,
                    emergencyRelation: emergencyRelation || null,
                    mbti: mbti || null,
                    enneagram: enneagram || null,
                    tshirtSize: tshirtSize || null,
                    foodAllergies: foodAllergies || null,
                    startDate: startDate ? new Date(startDate) : new Date(),
                    probationEndDate: probationEndDate ? new Date(probationEndDate) : null,
                    managerId: managerId || null,
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

        revalidatePath("/hr");
        revalidatePath("/hr/employees");

        return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
        console.error("Error creating employee:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
