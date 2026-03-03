import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
            return NextResponse.json({ error: "Forbidden: Only managers can approve leaves" }, { status: 403 });
        }

        const body = await req.json();
        const { status } = body;

        if (!status || !Object.values(ApprovalStatus).includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const updatedLeave = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: status as ApprovalStatus,
                approvedBy: session.user.id
            }
        });

        return NextResponse.json(updatedLeave);
    } catch (err: any) {
        console.error("Leave Request Update Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
