import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

/**
 * Enterprise Tax Invoice Generator (Thailand Compliance)
 * Generates sequential invoice numbers formatted as [PREFIX][YY][MM][000X]
 * The sequence automatically resets at the beginning of each new month.
 *
 * @param prefix Document type prefix (e.g., "INV", "ABB", "CN")
 * @returns Fully formatted sequential Tax Invoice Number string.
 */
export async function generateTaxInvoiceNumber(prefix: string = "INV"): Promise<string> {
    // We use a transaction/lock conceptually, but for now a simple lookup is sufficient
    // In high-concurrency environments, this should be wrapped in $transaction with FOR UPDATE
    const now = new Date();
    const yy = format(now, "yy"); // e.g. '26'
    const mm = format(now, "MM"); // e.g. '03'
    const basePrefix = `${prefix}${yy}${mm}`;

    const latestOrder = await prisma.order.findFirst({
        where: {
            taxInvoiceNumber: {
                startsWith: basePrefix
            }
        },
        orderBy: {
            taxInvoiceNumber: 'desc'
        }
    });

    if (!latestOrder || !latestOrder.taxInvoiceNumber) {
        return `${basePrefix}0001`; // Start of the month
    }

    const currentSequenceRaw = latestOrder.taxInvoiceNumber.replace(basePrefix, "");
    const currentSequence = parseInt(currentSequenceRaw, 10);

    if (isNaN(currentSequence)) {
        return `${basePrefix}0001`; // Fallback if corruption occurs
    }

    const nextSequence = currentSequence + 1;
    return `${basePrefix}${nextSequence.toString().padStart(4, '0')}`;
}

/**
 * Value-Added Tax (VAT 7%) Computational Engine
 * @param total Total amount including or excluding VAT
 * @param isInclusive Whether the total already contains VAT
 */
export function calculateVAT(total: number, isInclusive: boolean = true) {
    if (isInclusive) {
        const subtotalBeforeVat = total * 100 / 107;
        const vatAmount = total - subtotalBeforeVat;
        return { subtotalBeforeVat, vatAmount };
    } else {
        const vatAmount = total * 0.07;
        const subtotalBeforeVat = total;
        return { subtotalBeforeVat, vatAmount };
    }
}
