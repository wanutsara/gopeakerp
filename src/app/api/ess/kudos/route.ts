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

        // Fetch recent kudos for the wall of fame
        const recentKudos = await prisma.kudos.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { name: true, image: true } },
                receiver: { select: { user: { select: { name: true, image: true } } } }
            }
        });

        return NextResponse.json(recentKudos);
    } catch (error) {
        console.error("Error fetching kudos:", error);
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
        const { receiverId, badgeType, message } = body; // receiverId is the Employee.id

        if (!receiverId || !message) {
            return NextResponse.json({ error: "Receiver and message are required" }, { status: 400 });
        }

        const receiverEmployee = await prisma.employee.findUnique({
            where: { id: receiverId },
            include: { user: true }
        });

        if (!receiverEmployee) {
            return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
        }

        // Prevent self-kudos
        if (receiverEmployee.userId === session.user.id) {
            return NextResponse.json({ error: "You cannot send kudos to yourself." }, { status: 400 });
        }

        const newKudos = await prisma.kudos.create({
            data: {
                senderId: session.user.id,
                receiverId: receiverId,
                badgeType: badgeType || "THANK_YOU",
                message: message.substring(0, 500)
            },
            include: {
                sender: { select: { name: true } },
                receiver: { select: { user: { select: { name: true } } } }
            }
        });

        // Notify the receiver
        await prisma.notification.create({
            data: {
                userId: receiverEmployee.userId,
                title: `🌟 คุณได้รับดาวชื่นชม!`,
                message: `${newKudos.sender.name || 'เพื่อนร่วมงาน'} ส่งคำชื่นชมให้คุณ: "${message.substring(0, 50)}..."`,
                type: "SYSTEM"
            }
        });

        // Add Gamification EXP
        let senderExpGain = null;
        let receiverExpGain = null;

        return NextResponse.json({
            ...newKudos,
            xp: { sender: senderExpGain, receiver: receiverExpGain }
        }, { status: 201 });

    } catch (error) {
        console.error("Error sending kudos:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
