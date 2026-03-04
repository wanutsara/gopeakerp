import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["OWNER", "MANAGER"].includes(session.user?.role || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const announcements = await prisma.announcement.findMany({
            include: {
                author: { select: { name: true } },
                department: { select: { name: true } },
                interactions: true
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !["OWNER", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, content, isGlobal, targetDepartmentId, type, eventDate, pollOptions, publishAt, expireAt } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Create Announcement
        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                isGlobal: !!isGlobal,
                targetDepartmentId: isGlobal ? null : targetDepartmentId,
                authorId: session.user.id,
                type: type || "NEWS",
                eventDate: eventDate ? new Date(eventDate) : null,
                pollOptions: pollOptions ? pollOptions : null,
                publishAt: publishAt ? new Date(publishAt) : null,
                expireAt: expireAt ? new Date(expireAt) : null
            }
        });

        // 2. Fetch Target Users
        let targetUsers: { id: string }[] = [];
        if (isGlobal) {
            targetUsers = await prisma.user.findMany({ select: { id: true } });
        } else if (targetDepartmentId) {
            targetUsers = await prisma.user.findMany({
                where: { employee: { departmentId: targetDepartmentId } },
                select: { id: true }
            });
        } else {
            targetUsers = [];
        }

        // 3. Dispatch Notifications
        const notificationsData = targetUsers.map((u: any) => ({
            userId: u.id,
            title: `📢 ประกาศใหม่: ${title}`,
            message: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
            type: "ANNOUNCEMENT",
            referenceId: announcement.id
        }));

        if (notificationsData.length > 0) {
            await prisma.notification.createMany({
                data: notificationsData
            });
        }

        return NextResponse.json({ success: true, announcement, notifiedCount: notificationsData.length });

    } catch (error) {
        console.error("Error creating announcement:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
