import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, mappingId: string }> }) {
    try {
        const { mappingId } = await params;

        await prisma.channelProduct.delete({
            where: { id: mappingId }
        });

        revalidatePath("/oms/products");

        return NextResponse.json({ message: "Mapping deleted successfully" });
    } catch (error) {
        console.error("Error deleting product mapping:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
