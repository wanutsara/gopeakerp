export type ShippingChannel = 'TRUCK' | 'SEA' | 'AIR';
export type ShippingCalcMethod = 'WEIGHT' | 'CBM' | 'ACTUAL_MAX';

export interface SourcingConfigData {
    id?: string;
    companyBrandId?: string | null;
    rmbExchangeRate: number;
    usdExchangeRate: number;
    truckRatePerKg: number;
    truckRatePerCbm: number;
    truckLeadTime: string;
    seaRatePerKg: number;
    seaRatePerCbm: number;
    seaLeadTime: string;
    airRatePerKg: number;
    airRatePerCbm: number;
    airLeadTime: string;
    defaultPackagingCost: number;
    defaultLocalShippingCost: number;
    defaultPlatformFeePercent: number;
    defaultAdSpendPerUnit: number;
    defaultImportDutyRate: number;
}

export const DEFAULT_SOURCING_CONFIG: SourcingConfigData = {
    rmbExchangeRate: 5.0,
    usdExchangeRate: 35.5,
    truckRatePerKg: 40,
    truckRatePerCbm: 7500,
    truckLeadTime: '5-7 วัน',
    seaRatePerKg: 25,
    seaRatePerCbm: 4500,
    seaLeadTime: '14-20 วัน',
    airRatePerKg: 220,
    airRatePerCbm: 18000,
    airLeadTime: '3-5 วัน',
    defaultPackagingCost: 10,
    defaultLocalShippingCost: 35,
    defaultPlatformFeePercent: 6.0,
    defaultAdSpendPerUnit: 50,
    defaultImportDutyRate: 0
};

export interface CostCalculationInput {
    foreignCurrency?: string;
    foreignPrice: number;
    foreignDomesticShipping?: number;
    exchangeRate: number;
    shippingMethod?: ShippingCalcMethod | string;
    selectedChannel?: ShippingChannel | string;
    weightKg?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    cbm?: number;
    shippingRatePerKg?: number;
    shippingRatePerCbm?: number;
    truckRatePerKg?: number;
    truckRatePerCbm?: number;
    seaRatePerKg?: number;
    seaRatePerCbm?: number;
    airRatePerKg?: number;
    airRatePerCbm?: number;
    importDutyRate?: number;
    packagingCost?: number;
    localShippingCost?: number;
    platformFeePercent?: number;
    adSpendPerUnit?: number;
    targetSellingPrice?: number;
}

export interface ChannelBreakdownResult {
    channel: ShippingChannel;
    label: string;
    ratePerKg: number;
    ratePerCbm: number;
    shippingByWeightTHB: number;
    shippingByCbmTHB: number;
    shippingTHB: number;
    landedCostTHB: number;
    totalCostTHB: number;
    profitTHB: number;
    marginPercent: number;
    markupPercent: number;
    breakevenPrice: number;
}

export interface CostCalculationResult {
    // Itemized individual costs
    productCostTHB: number;
    domesticShippingTHB: number;
    foreignBaseTHB: number;
    importDutyTHB: number;
    packagingCostTHB: number;
    localShippingCostTHB: number;
    localFulfillmentTHB: number;
    platformFeeTHB: number;
    marketingTHB: number;
    computedCbm: number;

    // Multi-channel results (Truck / Sea / Air)
    channels: {
        truck: ChannelBreakdownResult;
        sea: ChannelBreakdownResult;
        air: ChannelBreakdownResult;
    };

    // Primary selected channel summary
    selectedChannel: ShippingChannel;
    internationalShippingTHB: number;
    landedCostTHB: number;
    totalCostTHB: number;
    targetSellingPrice: number;
    estProfitPerUnit: number;
    estMarginPercent: number;
    markupPercent: number;
    breakevenPrice: number;
}

const round2 = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const round4 = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 10000) / 10000;
};

export function calculateLandedCost(input: CostCalculationInput): CostCalculationResult {
    const foreignPrice = Number(input.foreignPrice) || 0;
    const foreignDomesticShipping = Number(input.foreignDomesticShipping) || 0;
    const exchangeRate = Number(input.exchangeRate) || 1;

    // 1. Itemized Foreign Costs in THB
    const productCostTHB = round2(foreignPrice * exchangeRate);
    const domesticShippingTHB = round2(foreignDomesticShipping * exchangeRate);
    const foreignBaseTHB = round2(productCostTHB + domesticShippingTHB);

    // 2. Weight & Volume (CBM)
    const weightKg = Number(input.weightKg) || 0;
    const lengthCm = Number(input.lengthCm) || 0;
    const widthCm = Number(input.widthCm) || 0;
    const heightCm = Number(input.heightCm) || 0;

    let computedCbm = Number(input.cbm) || 0;
    if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
        computedCbm = round4((lengthCm * widthCm * heightCm) / 1000000);
    }

    // 3. Other Itemized Local & Platform Costs
    const importDutyTHB = round2(Number(input.importDutyRate) || 0);
    const packagingCostTHB = round2(Number(input.packagingCost) || 0);
    const localShippingCostTHB = round2(Number(input.localShippingCost) || 0);
    const localFulfillmentTHB = round2(packagingCostTHB + localShippingCostTHB);

    const targetSellingPrice = round2(Number(input.targetSellingPrice) || 0);
    const platformFeePercent = Number(input.platformFeePercent) || 0;
    const platformFeeTHB = round2(targetSellingPrice * (platformFeePercent / 100));
    const marketingTHB = round2(Number(input.adSpendPerUnit) || 0);
    const feeRatio = 1 - platformFeePercent / 100;

    // 4. Channel Rates (with fallback to defaults if not set)
    const truckRatePerKg = input.truckRatePerKg !== undefined && Number(input.truckRatePerKg) > 0
        ? Number(input.truckRatePerKg)
        : (Number(input.shippingRatePerKg) > 0 ? Number(input.shippingRatePerKg) : DEFAULT_SOURCING_CONFIG.truckRatePerKg);
    const truckRatePerCbm = input.truckRatePerCbm !== undefined && Number(input.truckRatePerCbm) > 0
        ? Number(input.truckRatePerCbm)
        : (Number(input.shippingRatePerCbm) > 0 ? Number(input.shippingRatePerCbm) : DEFAULT_SOURCING_CONFIG.truckRatePerCbm);

    const seaRatePerKg = input.seaRatePerKg !== undefined && Number(input.seaRatePerKg) > 0
        ? Number(input.seaRatePerKg)
        : DEFAULT_SOURCING_CONFIG.seaRatePerKg;
    const seaRatePerCbm = input.seaRatePerCbm !== undefined && Number(input.seaRatePerCbm) > 0
        ? Number(input.seaRatePerCbm)
        : DEFAULT_SOURCING_CONFIG.seaRatePerCbm;

    const airRatePerKg = input.airRatePerKg !== undefined && Number(input.airRatePerKg) > 0
        ? Number(input.airRatePerKg)
        : DEFAULT_SOURCING_CONFIG.airRatePerKg;
    const airRatePerCbm = input.airRatePerCbm !== undefined && Number(input.airRatePerCbm) > 0
        ? Number(input.airRatePerCbm)
        : DEFAULT_SOURCING_CONFIG.airRatePerCbm;

    const shippingMethod = (input.shippingMethod || 'WEIGHT') as ShippingCalcMethod;

    const buildChannelResult = (
        channel: ShippingChannel,
        label: string,
        ratePerKg: number,
        ratePerCbm: number
    ): ChannelBreakdownResult => {
        const shippingByWeightTHB = round2(weightKg * ratePerKg);
        const shippingByCbmTHB = round2(computedCbm * ratePerCbm);

        let shippingTHB = 0;
        if (shippingMethod === 'CBM') {
            shippingTHB = computedCbm > 0 ? shippingByCbmTHB : shippingByWeightTHB;
        } else if (shippingMethod === 'ACTUAL_MAX') {
            shippingTHB = Math.max(shippingByWeightTHB, shippingByCbmTHB);
        } else {
            shippingTHB = weightKg > 0 ? shippingByWeightTHB : shippingByCbmTHB;
        }

        const landedCostTHB = round2(foreignBaseTHB + shippingTHB + importDutyTHB);
        const totalCostTHB = round2(landedCostTHB + localFulfillmentTHB + platformFeeTHB + marketingTHB);
        const profitTHB = round2(targetSellingPrice - totalCostTHB);
        const marginPercent = targetSellingPrice > 0 ? round2((profitTHB / targetSellingPrice) * 100) : 0;
        const markupPercent = totalCostTHB > 0 ? round2((profitTHB / totalCostTHB) * 100) : 0;
        const fixedCosts = landedCostTHB + localFulfillmentTHB + marketingTHB;
        const breakevenPrice = feeRatio > 0 ? round2(fixedCosts / feeRatio) : round2(fixedCosts);

        return {
            channel,
            label,
            ratePerKg,
            ratePerCbm,
            shippingByWeightTHB,
            shippingByCbmTHB,
            shippingTHB,
            landedCostTHB,
            totalCostTHB,
            profitTHB,
            marginPercent,
            markupPercent,
            breakevenPrice
        };
    };

    const truck = buildChannelResult('TRUCK', '🚛 ขนส่งทางรถ', truckRatePerKg, truckRatePerCbm);
    const sea = buildChannelResult('SEA', '🚢 ขนส่งทางเรือ', seaRatePerKg, seaRatePerCbm);
    const air = buildChannelResult('AIR', '✈️ ขนส่งทางแอร์', airRatePerKg, airRatePerCbm);

    const selectedChannel: ShippingChannel =
        input.selectedChannel === 'SEA' || input.selectedChannel === 'AIR'
            ? input.selectedChannel
            : 'TRUCK';

    const activeChannelResult =
        selectedChannel === 'SEA' ? sea : selectedChannel === 'AIR' ? air : truck;

    return {
        productCostTHB,
        domesticShippingTHB,
        foreignBaseTHB,
        importDutyTHB,
        packagingCostTHB,
        localShippingCostTHB,
        localFulfillmentTHB,
        platformFeeTHB,
        marketingTHB,
        computedCbm,
        channels: {
            truck,
            sea,
            air
        },
        selectedChannel,
        internationalShippingTHB: activeChannelResult.shippingTHB,
        landedCostTHB: activeChannelResult.landedCostTHB,
        totalCostTHB: activeChannelResult.totalCostTHB,
        targetSellingPrice,
        estProfitPerUnit: activeChannelResult.profitTHB,
        estMarginPercent: activeChannelResult.marginPercent,
        markupPercent: activeChannelResult.markupPercent,
        breakevenPrice: activeChannelResult.breakevenPrice
    };
}
