import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const item = await prisma.sourcingItem.findUnique({
            where: { id },
            include: { convertedProduct: true }
        });

        if (!item) {
            return NextResponse.json({ error: "Sourcing item not found" }, { status: 404 });
        }

        if (item.convertedProductId && item.convertedProduct) {
            return NextResponse.json({
                message: "Item already converted to product catalog",
                product: item.convertedProduct,
                alreadyConverted: true
            });
        }

        let defaultLocation = await prisma.location.findFirst({ where: { isDefault: true } });
        if (!defaultLocation) {
            defaultLocation = await prisma.location.findFirst();
        }

        if (!defaultLocation) {
            defaultLocation = await prisma.location.create({
                data: {
                    name: "Main Warehouse (BKK)",
                    type: "WAREHOUSE",
                    isDefault: true
                }
            });
        }

        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const generatedSku = `PRE-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

        const newProduct = await prisma.product.create({
            data: {
                name: item.title,
                sku: generatedSku,
                costPrice: item.landedCostTHB,
                salePrice: item.targetSellingPrice,
                stock: 0,
                images: item.imageUrl,
                description: item.notes || `Sourced from ${item.sourcePlatform} (${item.sourceUrl || ''})`,
                companyBrandId: item.companyBrandId,
                attributes: {
                    sourcingId: item.id,
                    sourcePlatform: item.sourcePlatform,
                    sourceUrl: item.sourceUrl,
                    supplierName: item.supplierName,
                    weightKg: item.weightKg,
                    cbm: item.cbm,
                    selectedChannel: item.selectedChannel,
                    landedCostTHB: item.landedCostTHB,
                    totalCostTHB: item.totalCostTHB,
                    estMarginPercent: item.estMarginPercent,
                    multiChannelBreakdown: {
                        truck: {
                            shippingTHB: item.shippingTruckTHB,
                            landedCostTHB: item.landedCostTruckTHB,
                            totalCostTHB: item.totalCostTruckTHB,
                            profitTHB: item.profitTruckTHB,
                            marginPercent: item.marginTruckPercent
                        },
                        sea: {
                            shippingTHB: item.shippingSeaTHB,
                            landedCostTHB: item.landedCostSeaTHB,
                            totalCostTHB: item.totalCostSeaTHB,
                            profitTHB: item.profitSeaTHB,
                            marginPercent: item.marginSeaPercent
                        },
                        air: {
                            shippingTHB: item.shippingAirTHB,
                            landedCostTHB: item.landedCostAirTHB,
                            totalCostTHB: item.totalCostAirTHB,
                            profitTHB: item.profitAirTHB,
                            marginPercent: item.marginAirPercent
                        }
                    },
                    isPreorder: true
                },
                inventoryLevels: {
                    create: {
                        locationId: defaultLocation.id,
                        available: 0,
                        committed: 0,
                        incoming: 0
                    }
                }
            }
        });

        const updatedItem = await prisma.sourcingItem.update({
            where: { id: item.id },
            data: {
                convertedProductId: newProduct.id,
                convertedAt: new Date(),
                stage: "APPROVED"
            },
            include: {
                convertedProduct: true
            }
        });

        return NextResponse.json({
            success: true,
            message: "Successfully converted to Product Catalog!",
            product: newProduct,
            sourcingItem: updatedItem
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error converting sourcing item to product:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}
