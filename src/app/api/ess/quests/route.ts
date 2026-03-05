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

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id },
            include: {
                questLogs: {
                    include: {
                        quest: {
                            include: { creator: { select: { name: true, image: true } } }
                        }
                    }
                }
            }
        });

        if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        // Fetch quests specifically assigned to them OR global open quests
        const availableOpenQuests = await prisma.quest.findMany({
            where: {
                status: 'OPEN',
                assignedToId: null,
            },
            include: { creator: { select: { name: true, image: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            myQuests: employee.questLogs,
            openQuests: availableOpenQuests
        });
    } catch (error) {
        console.error('Error fetching quests:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({ where: { userId: session.user.id } });
        if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        const body = await request.json();
        const { questId, action } = body; // action: 'claim' | 'submit'

        if (!questId || !action) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        if (action === 'claim') {
            const parentQuest = await prisma.quest.findUnique({ where: { id: questId } });
            if (!parentQuest || parentQuest.status !== 'OPEN') {
                return NextResponse.json({ error: 'Quest unavailable' }, { status: 400 });
            }

            // Claim it
            await prisma.$transaction([
                prisma.questLog.create({
                    data: {
                        questId,
                        employeeId: employee.id,
                        status: 'IN_PROGRESS'
                    }
                }),
                prisma.quest.update({
                    where: { id: questId },
                    data: { status: 'IN_PROGRESS', assignedToId: employee.id }
                })
            ]);

            return NextResponse.json({ success: true, message: 'Quest Claimed' });
        }

        if (action === 'submit') {
            const questLog = await prisma.questLog.findUnique({
                where: { questId_employeeId: { questId, employeeId: employee.id } }
            });

            if (!questLog || questLog.status !== 'IN_PROGRESS') {
                return NextResponse.json({ error: 'Cannot submit' }, { status: 400 });
            }

            await prisma.$transaction([
                prisma.questLog.update({
                    where: { id: questLog.id },
                    data: { status: 'REVIEWING' }
                }),
                prisma.quest.update({
                    where: { id: questId },
                    data: { status: 'REVIEWING' }
                })
            ]);

            return NextResponse.json({ success: true, message: 'Quest sent for review' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error processing quest action:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
