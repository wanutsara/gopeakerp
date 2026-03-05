import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const initiativeId = params.id;

        const quests = await prisma.quest.findMany({
            where: { initiativeId },
            include: {
                assignedTo: {
                    select: {
                        user: { select: { name: true, image: true } }
                    }
                }
            },
            orderBy: {
                orderIndex: 'asc'
            }
        });

        return NextResponse.json(quests);
    } catch (error) {
        console.error('Error fetching initiative quests:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const initiativeId = params.id;
        const { title } = await request.json();

        if (!title || typeof title !== 'string') {
            return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
        }

        // Get the latest orderIndex for OPEN status to append at the bottom
        const lastQuest = await prisma.quest.findFirst({
            where: { initiativeId, status: 'OPEN' },
            orderBy: { orderIndex: 'desc' }
        });

        const newOrderIndex = lastQuest ? (lastQuest as any).orderIndex + 1000 : 1000;

        const newQuest = await prisma.quest.create({
            data: {
                title,
                initiativeId,
                status: 'OPEN',
                description: '',
                expReward: 10,
                coinReward: 5,
                orderIndex: newOrderIndex,
                creatorId: session.user.id
            },
            include: {
                assignedTo: {
                    select: {
                        user: { select: { name: true, image: true } }
                    }
                }
            }
        });

        return NextResponse.json(newQuest, { status: 201 });
    } catch (error) {
        console.error('Error creating initiative quest:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
