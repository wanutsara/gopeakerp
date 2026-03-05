import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: customerId } = await params;

        // 1. Fetch Golden Record + Aliases
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                // @ts-ignore - TS cache is stale, aliases is a valid Customer relation in schema.prisma
                aliases: true,
                _count: { select: { orders: true } }
            }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // 2. Fetch Transaction History (The Story)
        const orders = await prisma.order.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: true // Includes SKU, Qty, Price, Name
            }
        });

        // 3. Mathematical RFM Calculation Unit
        const frequency = orders.length;
        const ltv = Number(customer.totalSpent || 0);
        const aov = frequency > 0 ? (ltv / frequency) : 0;

        let recencyDays = -1;
        if (frequency > 0) {
            const lastOrderDate = new Date(orders[0].createdAt);
            const today = new Date();
            const timeDiff = Math.abs(today.getTime() - lastOrderDate.getTime());
            recencyDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }

        const rfmMetrics = {
            ltv,
            aov,
            frequency,
            recencyDays
        };

        // 4. Brain Injection: Caching Layer Extraction
        let aiInsights = null;
        if (customer.aiPsychology && customer.aiNextAction) {
            aiInsights = {
                psychologicalProfile: customer.aiPsychology,
                nextBestAction: customer.aiNextAction,
                churnRisk: customer.aiChurnRisk || 'UNKNOWN',
                lastSync: customer.aiLastSync
            };
        }

        // Return unified CDP Object
        return NextResponse.json({
            success: true,
            customer,
            rfm: rfmMetrics,
            orders,
            aiInsights
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: customerId } = await params;
        const body = await request.json();
        const { name, phone, address, province, district, subdistrict, postalCode, source } = body;

        const updated = await prisma.customer.update({
            where: { id: customerId },
            data: {
                name,
                phone: phone || null,
                address: address || null,
                province: province || null,
                district: district || null,
                subdistrict: subdistrict || null,
                postalCode: postalCode || null,
                source: source || null,
            }
        });

        return NextResponse.json({ success: true, customer: updated });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: customerId } = await params;

        // SOFT DELETE: We archive the customer, keeping historical Cash Flow & Orders intact.
        await prisma.customer.update({
            where: { id: customerId },
            data: { isArchived: true }
        });

        return NextResponse.json({ success: true, message: 'Customer archived.' });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
