import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const returns = await prisma.returnRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                order: { include: { customer: true } },
                items: { include: { orderItem: { include: { product: true } } } }
            }
        });

        return NextResponse.json(returns);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
