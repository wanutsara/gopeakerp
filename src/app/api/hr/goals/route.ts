import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const unparsedUrl = new URL(request.url);
        const year = unparsedUrl.searchParams.get('year') || new Date().getFullYear().toString();

        const objectives = await prisma.okrObjective.findMany({
            where: { year: parseInt(year) },
            include: {
                keyResults: {
                    include: {
                        employee: { select: { user: { select: { name: true, image: true } } } },
                        initiatives: {
                            include: {
                                owner: { select: { user: { select: { name: true, image: true } } } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(objectives);
    } catch (error) {
        console.error('Error fetching OKRs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Only OWNER and MANAGER can create OKRs' }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, year, quarter, keyResults } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const newObjective = await prisma.okrObjective.create({
            data: {
                title,
                description,
                year: parseInt(year) || new Date().getFullYear(),
                quarter: parseInt(quarter) || 1,
            }
        });

        if (keyResults && Array.isArray(keyResults) && keyResults.length > 0) {
            const krPromises = keyResults.map(async (kr: any) => {
                if (!kr.title) return null;
                return prisma.okrKeyResult.create({
                    data: {
                        objectiveId: newObjective.id,
                        title: kr.title,
                        targetValue: Number(kr.targetValue) || 100,
                        unit: kr.unit || '%',
                        employeeId: kr.employeeId || null,
                    }
                });
            });
            await Promise.all(krPromises);
        }

        return NextResponse.json(newObjective, { status: 201 });
    } catch (error) {
        console.error('Error creating OKR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
