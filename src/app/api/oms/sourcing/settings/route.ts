import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { calculateLandedCost, DEFAULT_SOURCING_CONFIG } from "@/lib/sourcingCost";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const brandIdParam = searchParams.get("brandId");
        const companyBrandId =
            brandIdParam && brandIdParam !== "null" && brandIdParam !== "undefined" && brandIdParam !== ""
                ? brandIdParam
                : null;

        let config = null;

        if (companyBrandId) {
            config = await prisma.sourcingConfig.findUnique({
                where: { companyBrandId }
            });
        }

        if (!config) {
            config = await prisma.sourcingConfig.findFirst({
                where: { companyBrandId: null }
            });
        }

        if (!config) {
            config = await prisma.sourcingConfig.create({
                data: {
                    companyBrandId: null,
                    ...DEFAULT_SOURCING_CONFIG
                }
            });
        }

        return NextResponse.json(config);
    } catch (error: any) {
        console.error("Error fetching sourcing settings:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            companyBrandId: rawBrandId,
            rmbExchangeRate,
            usdExchangeRate,
            truckRatePerKg,
            truckRatePerCbm,
            truckLeadTime,
            seaRatePerKg,
            seaRatePerCbm,
            seaLeadTime,
            airRatePerKg,
            airRatePerCbm,
            airLeadTime,
            defaultPackagingCost,
            defaultLocalShippingCost,
            defaultPlatformFeePercent,
            defaultAdSpendPerUnit,
            defaultImportDutyRate,
            recalculateAll = false,
            overwriteItemLocalCosts = false
        } = body;

        const companyBrandId =
            rawBrandId && rawBrandId !== "null" && rawBrandId !== "undefined" && rawBrandId !== ""
                ? rawBrandId
                : null;

        const updatePayload = {
            rmbExchangeRate: Number(rmbExchangeRate) || DEFAULT_SOURCING_CONFIG.rmbExchangeRate,
            usdExchangeRate: Number(usdExchangeRate) || DEFAULT_SOURCING_CONFIG.usdExchangeRate,
            truckRatePerKg: Number(truckRatePerKg) || 0,
            truckRatePerCbm: Number(truckRatePerCbm) || 0,
            truckLeadTime: truckLeadTime || "5-7 วัน",
            seaRatePerKg: Number(seaRatePerKg) || 0,
            seaRatePerCbm: Number(seaRatePerCbm) || 0,
            seaLeadTime: seaLeadTime || "14-20 วัน",
            airRatePerKg: Number(airRatePerKg) || 0,
            airRatePerCbm: Number(airRatePerCbm) || 0,
            airLeadTime: airLeadTime || "3-5 วัน",
            defaultPackagingCost: Number(defaultPackagingCost) || 0,
            defaultLocalShippingCost: Number(defaultLocalShippingCost) || 0,
            defaultPlatformFeePercent: Number(defaultPlatformFeePercent) || 0,
            defaultAdSpendPerUnit: Number(defaultAdSpendPerUnit) || 0,
            defaultImportDutyRate: Number(defaultImportDutyRate) || 0
        };

        let existing = null;
        if (companyBrandId) {
            existing = await prisma.sourcingConfig.findUnique({ where: { companyBrandId } });
        } else {
            existing = await prisma.sourcingConfig.findFirst({ where: { companyBrandId: null } });
        }

        let config;
        if (existing) {
            config = await prisma.sourcingConfig.update({
                where: { id: existing.id },
                data: updatePayload
            });
        } else {
            config = await prisma.sourcingConfig.create({
                data: {
                    companyBrandId,
                    ...updatePayload
                }
            });
        }

        let updatedCount = 0;

        if (recalculateAll) {
            const whereClause: any = {};
            if (companyBrandId) {
                whereClause.companyBrandId = companyBrandId;
            }

            const items = await prisma.sourcingItem.findMany({ where: whereClause });

            for (const item of items) {
                const newExchangeRate =
                    item.foreignCurrency === "RMB"
                        ? updatePayload.rmbExchangeRate
                        : item.foreignCurrency === "USD"
                        ? updatePayload.usdExchangeRate
                        : 1.0;

                const pkgCost = overwriteItemLocalCosts ? updatePayload.defaultPackagingCost : item.packagingCost;
                const locShipCost = overwriteItemLocalCosts ? updatePayload.defaultLocalShippingCost : item.localShippingCost;
                const platFee = overwriteItemLocalCosts ? updatePayload.defaultPlatformFeePercent : item.platformFeePercent;
                const adSpend = overwriteItemLocalCosts ? updatePayload.defaultAdSpendPerUnit : item.adSpendPerUnit;

                const calculated = calculateLandedCost({
                    foreignCurrency: item.foreignCurrency,
                    foreignPrice: item.foreignPrice,
                    foreignDomesticShipping: item.foreignDomesticShipping,
                    exchangeRate: newExchangeRate,
                    shippingMethod: item.shippingMethod,
                    selectedChannel: item.selectedChannel,
                    weightKg: item.weightKg,
                    lengthCm: item.lengthCm,
                    widthCm: item.widthCm,
                    heightCm: item.heightCm,
                    cbm: item.cbm,
                    truckRatePerKg: updatePayload.truckRatePerKg,
                    truckRatePerCbm: updatePayload.truckRatePerCbm,
                    seaRatePerKg: updatePayload.seaRatePerKg,
                    seaRatePerCbm: updatePayload.seaRatePerCbm,
                    airRatePerKg: updatePayload.airRatePerKg,
                    airRatePerCbm: updatePayload.airRatePerCbm,
                    importDutyRate: item.importDutyRate,
                    packagingCost: pkgCost,
                    localShippingCost: locShipCost,
                    platformFeePercent: platFee,
                    adSpendPerUnit: adSpend,
                    targetSellingPrice: item.targetSellingPrice
                });

                await prisma.sourcingItem.update({
                    where: { id: item.id },
                    data: {
                        exchangeRate: newExchangeRate,
                        truckRatePerKg: updatePayload.truckRatePerKg,
                        truckRatePerCbm: updatePayload.truckRatePerCbm,
                        seaRatePerKg: updatePayload.seaRatePerKg,
                        seaRatePerCbm: updatePayload.seaRatePerCbm,
                        airRatePerKg: updatePayload.airRatePerKg,
                        airRatePerCbm: updatePayload.airRatePerCbm,
                        packagingCost: pkgCost,
                        localShippingCost: locShipCost,
                        platformFeePercent: platFee,
                        adSpendPerUnit: adSpend,
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
                        estProfitPerUnit: calculated.estProfitPerUnit,
                        estMarginPercent: calculated.estMarginPercent,
                        breakevenPrice: calculated.breakevenPrice
                    }
                });
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            config,
            updatedCount
        });
    } catch (error: any) {
        console.error("Error updating sourcing settings:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}
