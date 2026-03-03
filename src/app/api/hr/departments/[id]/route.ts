import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, lat, lng, radius, workStart, workEnd } = body;

        const department = await prisma.department.update({
            where: { id },
            data: {
                name,
                description,
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null,
                radius: radius ? parseFloat(radius) : null,
                workStart: workStart || null,
                workEnd: workEnd || null
            }
        });

        return NextResponse.json(department);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.department.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
