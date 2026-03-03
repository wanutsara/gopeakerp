import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const document = await prisma.employeeDocument.findUnique({
            where: { id }
        });

        if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

        await prisma.employeeDocument.delete({
            where: { id }
        });

        // Log
        await prisma.activityLog.create({
            data: {
                action: "DELETE",
                entity: "DOCUMENT",
                entityId: id,
                details: `Deleted document: ${document.title}`,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting document:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
