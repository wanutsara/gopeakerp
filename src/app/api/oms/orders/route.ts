import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                customer: true,
                items: true,
                fulfillments: true,
                returns: true
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
        const { date, subtotal, shippingFee, platformFee, discount, total, channel, notes } = body;

        const orderDate = new Date(date);

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
                total: Number(total) || 0,
                notes: notes || 'Daily Batch Entry',
                createdAt: orderDate,
            }
        });

        // Optionally, we could create a Transaction record for the General Ledger
        await prisma.transaction.create({
            data: {
                type: 'INCOME',
                amount: Number(total) || 0,
                amountTHB: Number(total) || 0,
                date: orderDate,
                category: 'SALES_REVENUE',
                description: `Sales Revenue from ${channel || 'OTHER'}`
            }
        });

        return NextResponse.json({ message: 'Revenue logged successfully', order: newOrder });

    } catch (error: any) {
        console.error('Error creating order log:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
