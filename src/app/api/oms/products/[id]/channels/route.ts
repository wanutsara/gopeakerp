import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const mappings = await prisma.channelProduct.findMany({
            where: { productId: id },
            orderBy: { channel: 'asc' }
        });
        return NextResponse.json(mappings);
    } catch (error) {
        console.error("Error fetching product mappings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { channel, platformSku } = body;

        if (!channel || !platformSku) {
            return NextResponse.json({ error: "Channel and Platform SKU are required" }, { status: 400 });
        }

        const newMapping = await prisma.channelProduct.create({
            data: {
                productId: id,
                channel,
                platformSku: String(platformSku).trim()
            }
        });

        revalidatePath("/oms/products");

        return NextResponse.json(newMapping, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "This Platform SKU is already mapped for this Channel" }, { status: 400 });
        }
        console.error("Error creating product mapping:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
