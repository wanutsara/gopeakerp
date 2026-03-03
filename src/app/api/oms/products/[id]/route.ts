import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, sku, costPrice, salePrice, stock, images } = body;

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                name,
                sku: skim(sku),
                costPrice: parseFloat(costPrice) || 0,
                salePrice: parseFloat(salePrice) || 0,
                stock: parseInt(stock) || 0,
                images,
            }
        });

        return NextResponse.json(updatedProduct);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
        }
        console.error("Error updating product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Ensure product exists
        const product = await prisma.product.findUnique({
            where: { id },
            include: { orderItems: true }
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (product.orderItems.length > 0) {
            return NextResponse.json({ error: "Cannot delete product with existing orders" }, { status: 400 });
        }

        await prisma.product.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

function skim(str: string | undefined | null) {
    if (!str) return null;
    const trimmed = str.trim();
    return trimmed === "" ? null : trimmed;
}
