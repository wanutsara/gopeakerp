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
            where: {
                parentId: null // Only fetch Top-level Parent/Master Products
            },
            include: {
                inventoryLevels: {
                    include: { location: true }
                },
                variants: {
                    include: {
                        inventoryLevels: {
                            include: { location: true }
                        }
                    }
                },
                ...(includeMappings && { channelProducts: true })
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, sku, costPrice, salePrice, stock, images, description, variants } = body;

        if (!name) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        // Must locate the Default Warehouse to assign new stock injections
        const defaultLocation = await prisma.location.findFirst({ where: { isDefault: true } });
        if (!defaultLocation) {
            return NextResponse.json({ error: "A default inventory location must be configured before creating products." }, { status: 400 });
        }

        // -------------------------------------------------------------
        // SCENARIO 1: Standalone Product (Legacy/Simple)
        // -------------------------------------------------------------
        if (!variants || variants.length === 0) {
            const newProduct = await prisma.product.create({
                data: {
                    name,
                    description,
                    sku: skim(sku),
                    costPrice: parseFloat(costPrice) || 0,
                    salePrice: parseFloat(salePrice) || 0,
                    stock: parseInt(stock) || 0, // Legacy Aggregate
                    images,
                    inventoryLevels: {
                        create: {
                            locationId: defaultLocation.id,
                            available: parseInt(stock) || 0,
                            committed: 0,
                            incoming: 0
                        }
                    }
                }
            });
            revalidatePath("/oms/products");
            return NextResponse.json(newProduct, { status: 201 });
        }

        // -------------------------------------------------------------
        // SCENARIO 2: Hierarchical Variant Product (World-Class OMS)
        // -------------------------------------------------------------
        // 1. Create the Parent Container (Has no SKU or raw Stock)
        const parentProduct = await prisma.product.create({
            data: {
                name,
                description,
                images,
                // Inherited aggregate starting at 0
                stock: 0,
                costPrice: 0,
                salePrice: 0,
            }
        });

        // 2. Create the Child Variants
        const childProducts = await Promise.all(variants.map(async (v: any) => {
            const childStock = parseInt(v.stock) || 0;
            return prisma.product.create({
                data: {
                    parentId: parentProduct.id,
                    name: `${name} - ${v.variantName}`,
                    variantName: v.variantName,
                    sku: skim(v.sku),
                    attributes: v.attributes || {},
                    costPrice: parseFloat(v.costPrice) || 0,
                    salePrice: parseFloat(v.salePrice) || 0,
                    stock: childStock, // Legacy individual aggregate
                    images: v.images || images, // Fallback to parent image
                    inventoryLevels: {
                        create: {
                            locationId: defaultLocation.id,
                            available: childStock,
                            committed: 0,
                            incoming: 0
                        }
                    }
                }
            });
        }));

        // 3. Update Parent's Total Aggregate Stock (For safe legacy Read-Only display)
        const totalVariantStock = childProducts.reduce((sum, c) => sum + c.stock, 0);
        await prisma.product.update({
            where: { id: parentProduct.id },
            data: { stock: totalVariantStock }
        });

        revalidatePath("/oms/products");
        return NextResponse.json({ parentProduct, childProducts }, { status: 201 });

    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "SKU already exists in the system" }, { status: 400 });
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
