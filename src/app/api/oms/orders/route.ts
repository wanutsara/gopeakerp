import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTaxInvoiceNumber, calculateVAT } from '@/lib/invoicing';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get('brandId');

        const orders = await prisma.order.findMany({
            where: brandId ? { companyBrandId: brandId } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                customer: true,
                items: true,
                fulfillments: true,
                returns: true,
                companyBrand: true
            }
        });

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, subtotal, shippingFee, platformFee, discount, total, channel, notes, isVatInclusive = true } = body;

        const orderDate = new Date(date);

        // Calculate Value-Added Tax (Thailand Context)
        const finalTotal = Number(total) || 0;
        const { subtotalBeforeVat, vatAmount } = calculateVAT(finalTotal, isVatInclusive);

        // Secure next Sequential e-Tax Invoice Number structure [YY][MM][000X]
        const taxInvoiceNumber = await generateTaxInvoiceNumber("INV");

        // We create a unified daily summary 'Order' record for simplicity,
        // or a specific order if needed. Currently, the dashboard sums up 'total'.
        const newOrder = await prisma.order.create({
            data: {
                channel: channel || 'OTHER',
                status: 'COMPLETED',
                subtotal: Number(subtotal) || 0,
                shippingFee: Number(shippingFee) || 0,
                platformFee: Number(platformFee) || 0,
                discount: Number(discount) || 0,
                total: finalTotal,
                isVatInclusive: isVatInclusive,
                vatAmount: vatAmount,
                subtotalBeforeVat: subtotalBeforeVat,
                taxInvoiceNumber: taxInvoiceNumber,
                notes: notes || 'Daily Batch Entry',
                createdAt: orderDate,
            }
        });

        // Optionally, we could create a Transaction record for the General Ledger
        await prisma.transaction.create({
            data: {
                type: 'INCOME',
                amount: finalTotal,
                amountTHB: finalTotal,
                taxAmount: vatAmount,
                taxType: "VAT_SALES",
                date: orderDate,
                category: 'SALES_REVENUE',
                description: `Sales Revenue [${taxInvoiceNumber}] from ${channel || 'OTHER'}`
            }
        });

        return NextResponse.json({ message: 'Revenue logged successfully', order: newOrder });

    } catch (error: any) {
        console.error('Error creating order log:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
