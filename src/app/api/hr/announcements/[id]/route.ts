import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["OWNER", "MANAGER"].includes(session.user?.role || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, content, isGlobal, targetDepartmentId, type, eventDate, pollOptions, publishAt, expireAt } = body;

        const { id } = await params;
        const updatedAnnouncement = await prisma.announcement.update({
            where: { id },
            data: {
                title,
                content,
                isGlobal: !!isGlobal,
                targetDepartmentId: isGlobal ? null : targetDepartmentId,
                type: type || "NEWS",
                eventDate: eventDate ? new Date(eventDate) : null,
                pollOptions: pollOptions ? pollOptions : null,
                publishAt: publishAt ? new Date(publishAt) : null,
                expireAt: expireAt ? new Date(expireAt) : null
            }
        });

        return NextResponse.json({ success: true, announcement: updatedAnnouncement });
    } catch (error) {
        console.error("Error updating announcement:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["OWNER", "MANAGER"].includes(session.user?.role || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await prisma.announcement.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Announcement deleted successfully" });
    } catch (error) {
        console.error("Error deleting announcement:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
