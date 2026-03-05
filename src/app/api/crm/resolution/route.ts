import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const matches = await prisma.resolutionMatch.findMany({
            where: { status: 'PENDING' },
            include: {
                masterCustomer: {
                    include: { _count: { select: { orders: true } } }
                },
                duplicateCustomer: {
                    include: { _count: { select: { orders: true } } }
                }
            },
            orderBy: { confidenceScore: 'desc' }
        });

        return NextResponse.json({ success: true, matches });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { matchId, action } = await request.json(); // ACTION: 'MERGE' | 'REJECT'

        const match = await prisma.resolutionMatch.findUnique({
            where: { id: matchId },
            include: { duplicateCustomer: true }
        });

        if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

        if (action === 'REJECT') {
            await prisma.resolutionMatch.update({
                where: { id: matchId },
                data: { status: 'REJECTED' }
            });
            return NextResponse.json({ success: true, message: 'Kept Separate' });
        }

        if (action === 'MERGE') {
            // Transaction to safely migrate all dependent data from Duplicate -> Master
            await prisma.$transaction(async (tx) => {
                // 1. Move Orders
                await tx.order.updateMany({
                    where: { customerId: match.duplicateCustomerId },
                    data: { customerId: match.masterCustomerId }
                });

                // 2. Move existing aliases (if any)
                await tx.customerAlias.updateMany({
                    where: { customerId: match.duplicateCustomerId },
                    data: { customerId: match.masterCustomerId }
                });

                // 3. Create a new alias linking the duplicate's original name/phone to the master
                await tx.customerAlias.create({
                    data: {
                        customerId: match.masterCustomerId,
                        name: match.duplicateCustomer.name,
                        profileName: match.duplicateCustomer.profileName,
                        phone: match.duplicateCustomer.phone,
                        source: match.duplicateCustomer.source
                    }
                });

                // 4. Absorb lifetime value
                await tx.customer.update({
                    where: { id: match.masterCustomerId },
                    data: { totalSpent: { increment: match.duplicateCustomer.totalSpent } }
                });

                // 5. Delete the duplicate customer entity (Native Prisma Cascade will automatically destroy the ResolutionMatch linked ticket)
                await tx.customer.delete({
                    where: { id: match.duplicateCustomerId }
                });
            });

            return NextResponse.json({ success: true, message: 'Identities Merged Successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
