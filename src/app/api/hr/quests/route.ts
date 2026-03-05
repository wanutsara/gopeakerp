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

        // Must be HR/Manager level to issue Quests
        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const unparsedUrl = new URL(request.url);
        const status = unparsedUrl.searchParams.get('status');

        let whereClause: any = {};
        if (status) {
            whereClause.status = status;
        }

        const quests = await prisma.quest.findMany({
            where: whereClause,
            include: {
                assignedTo: {
                    include: {
                        user: { select: { name: true, image: true, email: true } }
                    }
                },
                creator: { select: { name: true, image: true } },
                logs: {
                    include: {
                        employee: {
                            include: { user: { select: { name: true, image: true } } }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(quests);
    } catch (error) {
        console.error('Error fetching quests:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Only OWNER and MANAGER can create Quests' }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, expReward, coinReward, deadline, assignedToId } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Create the global Quest entity
        const newQuest = await prisma.quest.create({
            data: {
                title,
                description,
                expReward: Number(expReward) || 10,
                coinReward: Number(coinReward) || 0,
                deadline: deadline ? new Date(deadline) : null,
                assignedToId: assignedToId || null,
                creatorId: session.user.id,
                status: assignedToId ? 'IN_PROGRESS' : 'OPEN',
            },
        });

        // If deeply assigned to a specific Employee immediately upon creation, generate a QuestLog linking them
        if (assignedToId) {
            await prisma.questLog.create({
                data: {
                    questId: newQuest.id,
                    employeeId: assignedToId,
                    status: 'IN_PROGRESS'
                }
            });
        }

        return NextResponse.json(newQuest, { status: 201 });
    } catch (error) {
        console.error('Error creating quest:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { questId, action } = await request.json();
        if (!questId || !action) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

        const quest = await prisma.quest.findUnique({ where: { id: questId }, include: { assignedTo: true } });
        if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });

        if (action === 'approve' && quest.status === 'REVIEWING') {
            const employee = quest.assignedTo;
            if (!employee) return NextResponse.json({ error: 'No employee assigned' }, { status: 400 });

            // Core Gamification Algorithm: Payout EXP and level up calculation
            const newExp = employee.exp + quest.expReward;
            const newCoins = employee.coins + quest.coinReward;

            // Basic Leveling Curve: 100 EXP = 1 Level
            const expThreshold = employee.level * 100;
            let targetLevel = employee.level;
            let finalExp = newExp;

            if (newExp >= expThreshold) {
                targetLevel += 1;
                finalExp = newExp - expThreshold;
            }

            await prisma.$transaction([
                prisma.quest.update({
                    where: { id: questId },
                    data: { status: 'COMPLETED' }
                }),
                prisma.questLog.updateMany({
                    where: { questId, employeeId: employee.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                }),
                prisma.employee.update({
                    where: { id: employee.id },
                    data: { exp: finalExp, coins: newCoins, level: targetLevel }
                })
            ]);

            // Phase 17: Auto-calculate Initiative Progress if this Quest is linked to one
            if (quest.initiativeId) {
                const totalInitiativeQuests = await prisma.quest.count({ where: { initiativeId: quest.initiativeId } });
                const completedInitiativeQuests = await prisma.quest.count({ where: { initiativeId: quest.initiativeId, status: 'COMPLETED' } });

                const progress = totalInitiativeQuests > 0 ? Math.round((completedInitiativeQuests / totalInitiativeQuests) * 100) : 0;

                await prisma.initiative.update({
                    where: { id: quest.initiativeId },
                    data: { progress }
                });
            }

            return NextResponse.json({ success: true, message: 'Quest approved & EXP granted!' });
        }

        if (action === 'reject' && quest.status === 'REVIEWING') {
            await prisma.$transaction([
                prisma.quest.update({
                    where: { id: questId },
                    data: { status: 'IN_PROGRESS' }
                }),
                prisma.questLog.updateMany({
                    where: { questId },
                    data: { status: 'IN_PROGRESS' }
                })
            ]);
            return NextResponse.json({ success: true, message: 'Quest rejected, sent back to employee' });
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    } catch (error) {
        console.error('Error updating quest:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
