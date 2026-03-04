import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const expenseRequests = await prisma.expenseRequest.findMany({
            where: { requestorId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ requests: expenseRequests });

    } catch (error) {
        console.error("Error fetching ESS expenses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const body = await request.json();
        const { title, description, amount, expectedDate, category, vendorName, receiptUrl } = body;

        if (!title || amount === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newExpense = await prisma.expenseRequest.create({
            data: {
                requestorId: employee.id,
                departmentId: employee.departmentId,
                title,
                description,
                amount: parseFloat(amount),
                status: "PENDING",
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                category,
                vendorName,
                receiptUrl
            }
        });

        // Create notification for Manager/HR/Finance
        if (employee.managerId) {
            const manager = await prisma.employee.findUnique({ where: { id: employee.managerId }, include: { user: true } });
            if (manager && manager.user) {
                await prisma.notification.create({
                    data: {
                        userId: manager.user.id,
                        title: "คำขอเบิกจ่ายใหม่ (Expense)",
                        message: `${session.user.name} ได้ส่งคำขอเบิกจ่ายยอด ${amount} บาท`,
                        type: "SYSTEM",
                        referenceId: newExpense.id
                    }
                });
            }
        }

        // Always notify OWNER and FINANCE for expenses
        const financeAdmins = await prisma.user.findMany({ where: { role: { in: ["OWNER", "MANAGER"] } } });
        for (const admin of financeAdmins) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    title: "คำขอเบิกจ่ายใหม่รอตรวจสอบ",
                    message: `${session.user.name} ได้ส่งคำขอเบิกจ่ายยอด ${amount} บาท`,
                    type: "SYSTEM",
                    referenceId: newExpense.id
                }
            });
        }

        return NextResponse.json({ success: true, request: newExpense });

    } catch (error) {
        console.error("Error creating expense request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
