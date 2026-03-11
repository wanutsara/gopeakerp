import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const departments = await prisma.department.findMany({
            include: {
                _count: {
                    select: { employees: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(departments);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, lat, lng, radius, workStart, workEnd, logicalCutoff } = body;

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const department = await prisma.department.create({
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

        return NextResponse.json(department, { status: 201 });
    } catch (err: any) {
        if (err.code === 'P2002') {
            return NextResponse.json({ error: "Department name already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
