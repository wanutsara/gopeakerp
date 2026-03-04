import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const colleagues = await prisma.employee.findMany({
            where: { status: "ACTIVE" },
            select: {
                id: true,
                position: true,
                userId: true,
                user: { select: { name: true, image: true } },
                department: { select: { name: true } }
            },
            orderBy: { user: { name: 'asc' } }
        });

        return NextResponse.json(colleagues);
    } catch (error) {
        console.error("Error fetching colleagues:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
