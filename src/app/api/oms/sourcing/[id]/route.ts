import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { calculateLandedCost } from "@/lib/sourcingCost";

export async function GET(
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
            include: {
                convertedProduct: true,
                companyBrand: true
            }
        });

        if (!item) {
            return NextResponse.json({ error: "Sourcing item not found" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error: any) {
        console.error("Error fetching sourcing item:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.sourcingItem.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Sourcing item not found" }, { status: 404 });
        }

        const body = await request.json();

        const costInput = {
            foreignCurrency: body.foreignCurrency !== undefined ? body.foreignCurrency : existing.foreignCurrency,
            foreignPrice: body.foreignPrice !== undefined ? Number(body.foreignPrice) : existing.foreignPrice,
            foreignDomesticShipping: body.foreignDomesticShipping !== undefined ? Number(body.foreignDomesticShipping) : existing.foreignDomesticShipping,
            exchangeRate: body.exchangeRate !== undefined ? Number(body.exchangeRate) : existing.exchangeRate,
            shippingMethod: body.shippingMethod || existing.shippingMethod,
            selectedChannel: body.selectedChannel || existing.selectedChannel,
            weightKg: body.weightKg !== undefined ? Number(body.weightKg) : existing.weightKg,
            lengthCm: body.lengthCm !== undefined ? Number(body.lengthCm) : existing.lengthCm,
            widthCm: body.widthCm !== undefined ? Number(body.widthCm) : existing.widthCm,
            heightCm: body.heightCm !== undefined ? Number(body.heightCm) : existing.heightCm,
            cbm: body.cbm !== undefined ? Number(body.cbm) : existing.cbm,
            truckRatePerKg: body.truckRatePerKg !== undefined ? Number(body.truckRatePerKg) : existing.truckRatePerKg,
            truckRatePerCbm: body.truckRatePerCbm !== undefined ? Number(body.truckRatePerCbm) : existing.truckRatePerCbm,
            seaRatePerKg: body.seaRatePerKg !== undefined ? Number(body.seaRatePerKg) : existing.seaRatePerKg,
            seaRatePerCbm: body.seaRatePerCbm !== undefined ? Number(body.seaRatePerCbm) : existing.seaRatePerCbm,
            airRatePerKg: body.airRatePerKg !== undefined ? Number(body.airRatePerKg) : existing.airRatePerKg,
            airRatePerCbm: body.airRatePerCbm !== undefined ? Number(body.airRatePerCbm) : existing.airRatePerCbm,
            importDutyRate: body.importDutyRate !== undefined ? Number(body.importDutyRate) : existing.importDutyRate,
            packagingCost: body.packagingCost !== undefined ? Number(body.packagingCost) : existing.packagingCost,
            localShippingCost: body.localShippingCost !== undefined ? Number(body.localShippingCost) : existing.localShippingCost,
            platformFeePercent: body.platformFeePercent !== undefined ? Number(body.platformFeePercent) : existing.platformFeePercent,
            adSpendPerUnit: body.adSpendPerUnit !== undefined ? Number(body.adSpendPerUnit) : existing.adSpendPerUnit,
            targetSellingPrice: body.targetSellingPrice !== undefined ? Number(body.targetSellingPrice) : existing.targetSellingPrice
        };

        const calculated = calculateLandedCost(costInput);

        const updateData: any = {
            ...costInput,
            cbm: calculated.computedCbm,
            selectedChannel: calculated.selectedChannel,
            shippingRatePerKg: costInput.truckRatePerKg,
            shippingRatePerCbm: costInput.truckRatePerCbm,
            shippingTruckTHB: calculated.channels.truck.shippingTHB,
            landedCostTruckTHB: calculated.channels.truck.landedCostTHB,
            totalCostTruckTHB: calculated.channels.truck.totalCostTHB,
            profitTruckTHB: calculated.channels.truck.profitTHB,
            marginTruckPercent: calculated.channels.truck.marginPercent,
            shippingSeaTHB: calculated.channels.sea.shippingTHB,
            landedCostSeaTHB: calculated.channels.sea.landedCostTHB,
            totalCostSeaTHB: calculated.channels.sea.totalCostTHB,
            profitSeaTHB: calculated.channels.sea.profitTHB,
            marginSeaPercent: calculated.channels.sea.marginPercent,
            shippingAirTHB: calculated.channels.air.shippingTHB,
            landedCostAirTHB: calculated.channels.air.landedCostTHB,
            totalCostAirTHB: calculated.channels.air.totalCostTHB,
            profitAirTHB: calculated.channels.air.profitTHB,
            marginAirPercent: calculated.channels.air.marginPercent,
            landedCostTHB: calculated.landedCostTHB,
            totalCostTHB: calculated.totalCostTHB,
            targetSellingPrice: calculated.targetSellingPrice,
            estProfitPerUnit: calculated.estProfitPerUnit,
            estMarginPercent: calculated.estMarginPercent,
            breakevenPrice: calculated.breakevenPrice
        };

        if (body.title !== undefined) updateData.title = body.title.trim();
        if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl?.trim() || null;
        if (body.sourcePlatform !== undefined) updateData.sourcePlatform = body.sourcePlatform;
        if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl?.trim() || null;
        if (body.images !== undefined) updateData.images = body.images;
        if (body.category !== undefined) updateData.category = body.category?.trim() || null;
        if (body.supplierName !== undefined) updateData.supplierName = body.supplierName?.trim() || null;
        if (body.supplierContact !== undefined) updateData.supplierContact = body.supplierContact?.trim() || null;
        if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.orderIndex !== undefined) updateData.orderIndex = Number(body.orderIndex);
        if (body.companyBrandId !== undefined) updateData.companyBrandId = body.companyBrandId || null;

        if (body.stage !== undefined) {
            updateData.stage = body.stage;
            if (body.stage === 'DROPPED') {
                updateData.dropReason = body.dropReason || existing.dropReason || null;
            } else if (existing.stage === 'DROPPED' && body.stage !== 'DROPPED') {
                updateData.dropReason = null;
            }
        } else if (body.dropReason !== undefined) {
            updateData.dropReason = body.dropReason;
        }

        const updated = await prisma.sourcingItem.update({
            where: { id },
            data: updateData,
            include: {
                convertedProduct: {
                    select: { id: true, name: true, sku: true }
                },
                companyBrand: {
                    select: { id: true, name: true }
                }
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating sourcing item:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await prisma.sourcingItem.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Item deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting sourcing item:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}
