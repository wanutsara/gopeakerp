import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, newStatus } = body;

        if (!id || !newStatus) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Only allow valid statuses
        const validStatuses = ["ON_TIME", "LATE", "ABSENT", "OUT_OF_LOCATION", "HALF_DAY"];
        if (!validStatuses.includes(newStatus)) {
            return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
        }

        const updatedLog = await prisma.timeLog.update({
            where: { id },
            data: { status: newStatus }
        });

        return NextResponse.json({ success: true, log: updatedLog });

    } catch (error) {
        console.error("Error overriding attendance status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
