import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body; // e.g. "RSVP_YES", "VOTE_Pizza"

        if (!action) {
            return NextResponse.json({ error: "Action is required" }, { status: 400 });
        }

        const { id } = await params;

        const announcement = await prisma.announcement.findUnique({
            where: { id: id }
        });

        if (!announcement) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }

        // For Polling, an employee can only vote once per poll (we delete their old vote if they are changing it)
        if (announcement.type === 'POLL') {
            await prisma.announcementInteraction.deleteMany({
                where: {
                    announcementId: id,
                    userId: session.user.id
                }
            });
            // Then insert new vote (handled below)
        }

        // For Event RSVP, if action is same, maybe they are toggling? Here we'll just upsert/overwrite.
        if (announcement.type === 'EVENT') {
            await prisma.announcementInteraction.deleteMany({
                where: {
                    announcementId: id,
                    userId: session.user.id
                }
            });
        }

        // Create the interaction
        const interaction = await prisma.announcementInteraction.create({
            data: {
                announcementId: id,
                userId: session.user.id,
                action: action
            }
        });

        return NextResponse.json({ success: true, interaction }, { status: 201 });

    } catch (error) {
        console.error("Error submitting interaction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
