import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = session.user.role === "OWNER" || session.user.role === "MANAGER";

        // Admins see all requests. Staff see only theirs.
        const expenses = await prisma.expenseRequest.findMany({
            where: isAdmin ? undefined : {
                requestor: {
                    userId: session.user.id
                }
            },
            include: {
                requestor: { select: { id: true, user: { select: { name: true } } } },
                approver: { select: { id: true, user: { select: { name: true } } } },
                department: { select: { name: true } },
                items: true,
                transaction: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(expenses);
    } catch (error) {
        console.error("Error fetching expense requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // We need the logged in user's Employee ID
        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, category, vendorName, expectedDate, receiptUrl, items } = body;

        // Calculate total amount from items if provided
        let amount = parseFloat(body.amount) || 0;
        if (Array.isArray(items) && items.length > 0) {
            amount = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
        }

        if (!title || typeof title !== 'string') {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // --- Smart Categorization: WHT Mapping (Thailand Context) ---
        let whtRate = 0;
        const normalizedCategory = (category || "").toLowerCase();

        if (normalizedCategory.includes("โฆษณา") || normalizedCategory.includes("advertising")) {
            whtRate = 2; // ค่าโฆษณา 2%
        } else if (normalizedCategory.includes("จ้างทำของ") || normalizedCategory.includes("service") || normalizedCategory.includes("บริการ")) {
            whtRate = 3; // ค่าจ้างทำของ/บริการ 3%
        } else if (normalizedCategory.includes("เช่า") || normalizedCategory.includes("rent")) {
            whtRate = 5; // ค่าเช่า 5%
        } else if (normalizedCategory.includes("ขนส่ง") || normalizedCategory.includes("transport")) {
            whtRate = 1; // ค่าขนส่ง 1%
        }

        const whtAmount = amount * (whtRate / 100);
        const netPayable = amount - whtAmount;
        // -------------------------------------------------------------

        const newRequest = await prisma.expenseRequest.create({
            data: {
                title,
                description,
                amount,
                whtRate,
                whtAmount,
                netPayable,
                category,
                vendorName,
                receiptUrl,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                requestorId: employee.id,
                departmentId: employee.departmentId,
                status: "PENDING",
                items: Array.isArray(items) && items.length > 0 ? {
                    create: items.map(impl => ({
                        itemName: typeof impl.itemName === 'string' ? impl.itemName.substring(0, 250) : "Unknown",
                        quantity: parseInt(impl.quantity) || 1,
                        price: parseFloat(impl.price) || 0
                    }))
                } : undefined
            },
            include: {
                items: true,
                requestor: { select: { user: { select: { name: true } } } }
            }
        });

        revalidatePath("/finance");
        revalidatePath("/finance/expenses");

        return NextResponse.json(newRequest, { status: 201 });
    } catch (error) {
        console.error("Error creating expense request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
