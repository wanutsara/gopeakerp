import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = session.user.role;
        if (userRole !== "OWNER" && userRole !== "MANAGER" && userRole !== "HR") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { status } = body;

        if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Fetch original to get employeeId
        const originalReq = await prisma.overtimeRequest.findUnique({
            where: { id },
            include: { employee: { include: { user: true } } }
        });

        if (!originalReq) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.overtimeRequest.update({
            where: { id },
            data: {
                status,
                approvedBy: session.user.id
            }
        });

        // Notify employee
        await prisma.notification.create({
            data: {
                userId: originalReq.employee.userId,
                title: "อัปเดตคำขอทำล่วงเวลา (OT)",
                message: `คำขอ OT วันที่ ${new Date(originalReq.date).toLocaleDateString('th-TH')} ของคุณได้รับการ ${status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}`,
                type: "OVERTIME_RESPONSE",
                referenceId: originalReq.id
            }
        });

        return NextResponse.json(updated);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = session.user.role;
        if (userRole !== "OWNER" && userRole !== "MANAGER" && userRole !== "HR") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        await prisma.overtimeRequest.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
