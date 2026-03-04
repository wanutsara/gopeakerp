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

        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 50
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: session.user.id, isRead: false }
        });

        return NextResponse.json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, id } = body;

        if (action === "MARK_READ") {
            if (id) {
                // Mark single notification as read
                await prisma.notification.updateMany({
                    where: { id: id, userId: session.user.id },
                    data: { isRead: true }
                });
            } else {
                // Mark ALL notifications as read
                await prisma.notification.updateMany({
                    where: { userId: session.user.id, isRead: false },
                    data: { isRead: true }
                });
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Error updating notifications:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
