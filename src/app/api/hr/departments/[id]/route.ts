import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, lat, lng, radius, workStart, workEnd, logicalCutoff } = body;

        const department = await prisma.department.update({
            where: { id },
            data: {
                name,
                description,
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null,
                radius: radius ? parseFloat(radius) : null,
                workStart: workStart || null,
                workEnd: workEnd || null,
                logicalCutoff: logicalCutoff || null
            }
        });

        revalidatePath("/hr");
        revalidatePath("/hr/departments");

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

        revalidatePath("/hr");
        revalidatePath("/hr/departments");

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
