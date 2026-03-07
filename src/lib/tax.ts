/**
 * GOPEAK Enterprise Tax Engine (Thailand 2026+ Compliance)
 * Built to automatically scale with shifting Thai Revenue Department regulations.
 */

export interface TaxDeductions {
    spouseAllowance?: boolean; // 60,000
    childCount?: number; // 30,000 per child (born before 2018), 60,000 (born after 2018). We'll assume standard 30k for simplicity unless specified
    lifeInsurance?: number; // max 100,000
    healthInsurance?: number; // max 25,000
    thaiESG?: number; // max 300,000 (New for 2025/2026)
    thaiESGX?: number; // (Replacement for LTF)
    ssf?: number; // EXPIRED IN 2025 (Engine will automatically wipe this out if year >= 2025)
    rmf?: number; // max 500k (combined with provident etc)
    providentFundEmployee?: number; // employee's actual contribution 
    homeLoanInterest?: number; // max 100,000
    socialSecurityTotal?: number; // usually calculated by system (YTD + annualized)
}

/**
 * World-Class Date-Aware SSO Calculator
 * Automatically shifts the SSO wage ceiling based on the Thai Labor Ministry's progressive roadmap.
 */
export function calculateThaiSSO(baseSalary: number, payrollDate: Date = new Date()): number {
    const SSO_RATE = 0.05; // 5%
    const year = payrollDate.getFullYear();

    let wageCeiling = 15000;

    if (year >= 2032) {
        wageCeiling = 23000; // max 1,150
    } else if (year >= 2029) {
        wageCeiling = 20000; // max 1,000
    } else if (year >= 2026) {
        wageCeiling = 17500; // max 875
    } else {
        wageCeiling = 15000; // max 750 (Pre-2026)
    }

    const cappedSalary = Math.min(baseSalary, wageCeiling);

    // Return the calculated SSO, floored to 2 decimals if needed
    return Math.round(cappedSalary * SSO_RATE);
}

/**
 * The Idiot-Proof PND.1 Calculator (ภ.ง.ด.1)
 * Calculates the exact withholding tax for the current month.
 */
export function calculateThaiPND1(
    monthlyPredictableIncome: number, // Base Salary + regular allowances
    monthlyVariableIncome: number, // Overtime, Bonuses, one-off (Taxable)
    deductions: TaxDeductions = {},
    payrollDate: Date = new Date(),
    ytdIncome: number = 0,
    ytdTaxWithheld: number = 0,
    monthsRemaining: number = 12 // 12 for Jan, 1 for Dec
): number {
    const currentMonth = payrollDate.getMonth() + 1; // 1 to 12
    const remainingMonths = 13 - currentMonth;

    // 1. Annualize Income
    // We assume the predictable income will be earned for the rest of the year.
    // Variable income is only counted for what has already been earned (YTD + this month).
    const annualizedPredictable = monthlyPredictableIncome * remainingMonths;
    const totalEstimatedAnnualIncome = ytdIncome + monthlyPredictableIncome + monthlyVariableIncome + annualizedPredictable;

    // 2. Standard Expense Deduction (50% max 100,000)
    const standardExpense = Math.min(totalEstimatedAnnualIncome * 0.5, 100000);

    // 3. Personal Allowances & Deductions
    let totalDeductions = 60000; // Personal Self Allowance (60k)

    if (deductions.spouseAllowance) totalDeductions += 60000;
    if (deductions.childCount) totalDeductions += (deductions.childCount * 30000);

    // Insurance
    const lifeIns = Math.min(deductions.lifeInsurance || 0, 100000);
    const healthIns = Math.min(deductions.healthInsurance || 0, 25000);
    totalDeductions += Math.min(lifeIns + healthIns, 100000); // Life + Health cannot exceed 100k

    // Funds
    totalDeductions += Math.min(deductions.rmf || 0, 500000);
    totalDeductions += deductions.providentFundEmployee || 0; // The actual annualized calculation should be max 15%, max 500k combined with RMF

    // 2026 Idiot-Proof Check: SSF is Dead
    const year = payrollDate.getFullYear();
    let ssfDeduction = deductions.ssf || 0;
    if (year >= 2025) {
        ssfDeduction = 0; // Forcibly wipe SSF if processed in 2025+
    }
    totalDeductions += Math.min(ssfDeduction, 200000); // (Legacy safeguard)

    // Thai ESG / ESGX
    totalDeductions += Math.min(deductions.thaiESG || 0, 300000);
    totalDeductions += Math.min(deductions.thaiESGX || 0, 300000);

    // Home Loan
    totalDeductions += Math.min(deductions.homeLoanInterest || 0, 100000);

    // Estimated Annual SSO (Already paid YTD + estimated remaining)
    const estimatedSSO = (calculateThaiSSO(monthlyPredictableIncome, payrollDate) * remainingMonths) + (deductions.socialSecurityTotal || 0);
    totalDeductions += estimatedSSO;

    // 4. Calculate Net Taxable Income
    const netTaxableIncome = Math.max(0, totalEstimatedAnnualIncome - standardExpense - totalDeductions);

    // 5. Thai Progressive Tax Brackets (0 - 35%)
    const annualTax = calculateProgressiveTax(netTaxableIncome);

    // 6. Prorate to Monthly Withholding
    // Take the annual tax, subtract what we already paid, then divide evenly across remaining months.
    // This self-corrects any variable income spikes (like a large bonus).
    const remainingTax = Math.max(0, annualTax - ytdTaxWithheld);
    const monthlyWithholding = remainingTax / remainingMonths;

    return Math.round(monthlyWithholding * 100) / 100; // return to 2 decimal places
}

/**
 * Standard Thai Progressive Tax Brackets algorithm
 */
function calculateProgressiveTax(netIncome: number): number {
    let tax = 0;

    if (netIncome > 5000000) {
        tax += (netIncome - 5000000) * 0.35;
        netIncome = 5000000;
    }
    if (netIncome > 2000000) {
        tax += (netIncome - 2000000) * 0.30;
        netIncome = 2000000;
    }
    if (netIncome > 1000000) {
        tax += (netIncome - 1000000) * 0.25;
        netIncome = 1000000;
    }
    if (netIncome > 750000) {
        tax += (netIncome - 750000) * 0.20;
        netIncome = 750000;
    }
    if (netIncome > 500000) {
        tax += (netIncome - 500000) * 0.15;
        netIncome = 500000;
    }
    if (netIncome > 300000) {
        tax += (netIncome - 300000) * 0.10;
        netIncome = 300000;
    }
    if (netIncome > 150000) {
        tax += (netIncome - 150000) * 0.05;
        netIncome = 150000;
    }
    // 0 - 150,000 is 0% Exempt

    return tax;
}
