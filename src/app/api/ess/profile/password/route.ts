import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: "User not found or unauthenticated" }, { status: 404 });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง (Invalid current password)" }, { status: 401 });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedNewPassword }
        });

        // Log the change
        await prisma.activityLog.create({
            data: {
                action: "UPDATE",
                entity: "USER_PASSWORD",
                entityId: user.id,
                details: "User changed their password",
            }
        });

        return NextResponse.json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error("Error changing password:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
