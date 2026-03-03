import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentType } from "@prisma/client";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { employeeId, type, title, fileUrl } = body;

        if (!employeeId || !type || !title || !fileUrl) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const document = await prisma.employeeDocument.create({
            data: {
                employeeId,
                type: type as DocumentType,
                title,
                fileUrl,
            }
        });

        // Log
        await prisma.activityLog.create({
            data: {
                action: "CREATE",
                entity: "DOCUMENT",
                entityId: document.id,
                details: `Uploaded document: ${title}`,
            }
        });

        return NextResponse.json(document, { status: 201 });
    } catch (err: any) {
        console.error("Document Create Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
