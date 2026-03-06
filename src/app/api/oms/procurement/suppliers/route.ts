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

        const suppliers = await prisma.supplier.findMany({
            orderBy: { reliabilityScore: 'desc' }
        });

        return NextResponse.json(suppliers);
    } catch (error: any) {
        console.error('Error fetching suppliers:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        if (!data.name) {
            return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
        }

        const supplier = await prisma.supplier.create({
            data: {
                name: data.name,
                contactName: data.contactName,
                email: data.email,
                phone: data.phone,
                address: data.address,
                leadTimeDays: data.leadTimeDays || 7
            }
        });

        return NextResponse.json(supplier);
    } catch (error: any) {
        console.error('Error creating supplier:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
