import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const includeMappings = searchParams.get('mappings') === 'true';

        // We can use the SETTINGS or a new module like OMS. 
        // For simplicity, let's treat Product Catalog reading as a basic operation, but we should secure it.
        // Assuming we add OMS module later, for now we will just require authentication.
        // Or we can use generic system permission. Let's rely on session.

        const products = await prisma.product.findMany({
            include: {
                ...(includeMappings && { channelProducts: true })
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, sku, costPrice, salePrice, stock, images } = body;

        if (!name) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                sku: skim(sku),
                costPrice: parseFloat(costPrice) || 0,
                salePrice: parseFloat(salePrice) || 0,
                stock: parseInt(stock) || 0,
                images,
            }
        });

        revalidatePath("/oms/products");

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
        }
        console.error("Error creating product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

function skim(str: string | undefined | null) {
    if (!str) return null;
    const trimmed = str.trim();
    return trimmed === "" ? null : trimmed;
}
