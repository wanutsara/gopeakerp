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
        const stage = searchParams.get('stage');
        const platform = searchParams.get('platform');
        const search = searchParams.get('search');
        const brandId = searchParams.get('brandId');

        const where: any = {};

        if (stage && stage !== 'ALL') {
            where.stage = stage;
        }

        if (platform && platform !== 'ALL') {
            where.sourcePlatform = platform;
        }

        if (brandId && brandId !== 'null' && brandId !== 'undefined' && brandId !== '') {
            where.companyBrandId = brandId;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { supplierName: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } }
            ];
        }

        const items = await prisma.sourcingItem.findMany({
            where,
            include: {
                convertedProduct: {
                    select: {
                        id: true,
                        name: true,
                        sku: true
                    }
                },
                companyBrand: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { orderIndex: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json(items);
    } catch (error: any) {
        console.error("Error fetching sourcing items:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Load backend default config if available
        const config = await prisma.sourcingConfig.findFirst({
            where: body.companyBrandId ? { companyBrandId: body.companyBrandId } : { companyBrandId: null }
        }) || DEFAULT_SOURCING_CONFIG;

        const {
            title,
            sourceUrl,
            sourcePlatform = "1688",
            imageUrl,
            images,
            category,
            supplierName,
            supplierContact,
            notes,
            stage = "IDEA",
            priority = "MEDIUM",
            foreignCurrency = "RMB",
            foreignPrice = 0,
            foreignDomesticShipping = 0,
            exchangeRate = foreignCurrency === "USD" ? config.usdExchangeRate : config.rmbExchangeRate,
            shippingMethod = "WEIGHT",
            selectedChannel = "TRUCK",
            weightKg = 0,
            lengthCm = 0,
            widthCm = 0,
            heightCm = 0,
            cbm = 0,
            truckRatePerKg = config.truckRatePerKg,
            truckRatePerCbm = config.truckRatePerCbm,
            seaRatePerKg = config.seaRatePerKg,
            seaRatePerCbm = config.seaRatePerCbm,
            airRatePerKg = config.airRatePerKg,
            airRatePerCbm = config.airRatePerCbm,
            importDutyRate = config.defaultImportDutyRate,
            packagingCost = config.defaultPackagingCost,
            localShippingCost = config.defaultLocalShippingCost,
            platformFeePercent = config.defaultPlatformFeePercent,
            adSpendPerUnit = config.defaultAdSpendPerUnit,
            targetSellingPrice = 0,
            companyBrandId,
            dropReason
        } = body;

        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Product title is required" }, { status: 400 });
        }

        // Calculate all multi-channel landed cost metrics server-side
        const calculated = calculateLandedCost({
            foreignCurrency,
            foreignPrice,
            foreignDomesticShipping,
            exchangeRate,
            shippingMethod,
            selectedChannel,
            weightKg,
            lengthCm,
            widthCm,
            heightCm,
            cbm,
            truckRatePerKg,
            truckRatePerCbm,
            seaRatePerKg,
            seaRatePerCbm,
            airRatePerKg,
            airRatePerCbm,
            importDutyRate,
            packagingCost,
            localShippingCost,
            platformFeePercent,
            adSpendPerUnit,
            targetSellingPrice
        });

        // Determine next orderIndex in stage
        const lastItem = await prisma.sourcingItem.findFirst({
            where: { stage },
            orderBy: { orderIndex: 'desc' },
            select: { orderIndex: true }
        });
        const orderIndex = lastItem ? lastItem.orderIndex + 1 : 0;

        const newItem = await prisma.sourcingItem.create({
            data: {
                title: title.trim(),
                sourceUrl: sourceUrl?.trim() || null,
                sourcePlatform,
                imageUrl: imageUrl?.trim() || null,
                images: images || null,
                category: category?.trim() || null,
                supplierName: supplierName?.trim() || null,
                supplierContact: supplierContact?.trim() || null,
                notes: notes?.trim() || null,
                stage,
                priority,
                orderIndex,
                dropReason: stage === 'DROPPED' ? (dropReason || null) : null,
                foreignCurrency,
                foreignPrice: Number(foreignPrice) || 0,
                foreignDomesticShipping: Number(foreignDomesticShipping) || 0,
                exchangeRate: Number(exchangeRate) || 1,
                shippingMethod,
                selectedChannel: calculated.selectedChannel,
                weightKg: Number(weightKg) || 0,
                lengthCm: Number(lengthCm) || 0,
                widthCm: Number(widthCm) || 0,
                heightCm: Number(heightCm) || 0,
                cbm: calculated.computedCbm,
                shippingRatePerKg: Number(truckRatePerKg) || 0,
                shippingRatePerCbm: Number(truckRatePerCbm) || 0,
                truckRatePerKg: Number(truckRatePerKg) || 0,
                truckRatePerCbm: Number(truckRatePerCbm) || 0,
                seaRatePerKg: Number(seaRatePerKg) || 0,
                seaRatePerCbm: Number(seaRatePerCbm) || 0,
                airRatePerKg: Number(airRatePerKg) || 0,
                airRatePerCbm: Number(airRatePerCbm) || 0,
                importDutyRate: Number(importDutyRate) || 0,
                packagingCost: Number(packagingCost) || 0,
                localShippingCost: Number(localShippingCost) || 0,
                platformFeePercent: Number(platformFeePercent) || 0,
                adSpendPerUnit: Number(adSpendPerUnit) || 0,

                // Multi-channel snapshots
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

                // Primary selected channel snapshot
                landedCostTHB: calculated.landedCostTHB,
                totalCostTHB: calculated.totalCostTHB,
                targetSellingPrice: calculated.targetSellingPrice,
                estProfitPerUnit: calculated.estProfitPerUnit,
                estMarginPercent: calculated.estMarginPercent,
                breakevenPrice: calculated.breakevenPrice,
                companyBrandId: companyBrandId || null,
                createdById: session.user.id
            },
            include: {
                companyBrand: {
                    select: { id: true, name: true }
                }
            }
        });

        return NextResponse.json(newItem, { status: 201 });
    } catch (error: any) {
        console.error("Error creating sourcing item:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}
