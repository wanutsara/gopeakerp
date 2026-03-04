import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
    try {
        let setting = await prisma.companySetting.findFirst();
        if (!setting) {
            setting = await prisma.companySetting.create({
                data: {} // Uses schema defaults
            });
        }
        return NextResponse.json(setting);
    } catch (error) {
        console.error("Error fetching company settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();

        // Find existing record
        const setting = await prisma.companySetting.findFirst();

        const dataToUpdate = {
            defaultLat: body.defaultLat ? parseFloat(body.defaultLat) : null,
            defaultLng: body.defaultLng ? parseFloat(body.defaultLng) : null,
            defaultRadius: body.defaultRadius ? parseFloat(body.defaultRadius) : 100,
            defaultWorkStart: body.defaultWorkStart || "09:00",
            defaultWorkEnd: body.defaultWorkEnd || "18:00",
        };

        let updated;
        if (setting) {
            updated = await prisma.companySetting.update({
                where: { id: setting.id },
                data: dataToUpdate
            });
        } else {
            updated = await prisma.companySetting.create({
                data: dataToUpdate
            });
        }

        // Log the change
        await prisma.activityLog.create({
            data: {
                action: "UPDATE",
                entity: "COMPANY_SETTING",
                entityId: updated.id,
                details: `Updated global attendance settings`,
            }
        });

        revalidatePath("/hr");
        revalidatePath("/hr/settings");

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating company settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
