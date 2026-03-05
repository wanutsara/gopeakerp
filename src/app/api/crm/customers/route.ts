import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const search = url.searchParams.get('q') || '';
        const province = url.searchParams.get('province') || '';

        // Build generic where clause
        const whereClause: any = { isArchived: false };
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { profileName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } }
            ];
        }
        if (province) {
            whereClause.province = province;
        }

        const customers = await prisma.customer.findMany({
            where: whereClause,
            orderBy: { totalSpent: 'desc' },
            include: {
                _count: {
                    select: { orders: true }
                }
            },
            take: 100 // Cap at 100 for now
        });

        // Compute advanced stats
        const geoStatsRaw = await prisma.customer.groupBy({
            by: ['province'],
            _count: { id: true },
            where: { province: { not: null } },
            orderBy: { _count: { id: 'desc' } }
        });

        return NextResponse.json({ success: true, customers, geoStats: geoStatsRaw });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, phone, address, province, district, subdistrict, postalCode, source } = body;

        if (!name) return NextResponse.json({ error: 'Customer Name is required' }, { status: 400 });

        const customer = await prisma.customer.create({
            data: {
                name,
                phone: phone || null,
                address: address || null,
                province: province || null,
                district: district || null,
                subdistrict: subdistrict || null,
                postalCode: postalCode || null,
                source: source || 'MANUAL',
            }
        });

        return NextResponse.json({ success: true, customer });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
