import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["OWNER", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const expenses = await prisma.expenseRequest.findMany({
            include: {
                requestor: { include: { user: true } },
                department: true,
                approver: { include: { user: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(expenses);
    } catch (error) {
        console.error("Error fetching admin expenses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
