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

        // Fetch employee to get departmentId
        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        const announcements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                OR: [
                    { isGlobal: true },
                    { targetDepartmentId: employee?.departmentId || undefined }
                ],
                AND: [
                    {
                        OR: [
                            { publishAt: null },
                            { publishAt: { lte: new Date() } }
                        ]
                    },
                    {
                        OR: [
                            { expireAt: null },
                            { expireAt: { gte: new Date() } }
                        ]
                    }
                ]
            },
            include: {
                author: { select: { name: true } },
                department: { select: { name: true } },
                interactions: true
            },
            orderBy: { createdAt: "desc" },
            take: 10
        });

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error("Error fetching ESS announcements:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
