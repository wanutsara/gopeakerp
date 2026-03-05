import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QuestStatus } from '@prisma/client';

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { questId, newStatus, newOrderIndex } = body;

        const quest = await prisma.quest.findUnique({
            where: { id: questId },
            include: { initiative: true }
        });

        if (!quest) {
            return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        }

        // Check gamification bounds to avoid double-payout
        const justCompleted = quest.status !== 'COMPLETED' && newStatus === 'COMPLETED';
        const justUncompleted = quest.status === 'COMPLETED' && newStatus !== 'COMPLETED';

        // Use Prisma Transaction to guarantee data integrity across Gamification, Quests, and OKRs
        await prisma.$transaction(async (tx) => {

            // 1. Update the Card's position and visual column state
            await tx.quest.update({
                where: { id: questId },
                data: {
                    status: newStatus as QuestStatus,
                    orderIndex: newOrderIndex
                }
            });

            // 2. Dispense RPG Attributes
            if (quest.assignedToId) {
                if (justCompleted) {
                    await tx.employee.update({
                        where: { id: quest.assignedToId },
                        data: {
                            exp: { increment: quest.expReward },
                            coins: { increment: quest.coinReward }
                        }
                    });
                } else if (justUncompleted) {
                    await tx.employee.update({
                        where: { id: quest.assignedToId },
                        data: {
                            exp: { decrement: quest.expReward },
                            coins: { decrement: quest.coinReward }
                        }
                    });
                }
            }

            // 3. Initiate the "Golden Thread" Cascading Value Updates
            if (quest.initiativeId) {
                const allIniQuests = await tx.quest.findMany({
                    where: { initiativeId: quest.initiativeId }
                });

                const total = allIniQuests.length;
                const completed = allIniQuests.filter(q =>
                    q.id === questId ? newStatus === 'COMPLETED' : q.status === 'COMPLETED'
                ).length;

                const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

                const updatedIni = await tx.initiative.update({
                    where: { id: quest.initiativeId },
                    data: { progress: newProgress }
                });

                if (updatedIni.keyResultId) {
                    const siblingInis = await tx.initiative.findMany({
                        where: { keyResultId: updatedIni.keyResultId }
                    });

                    const totalIni = siblingInis.length;
                    const accumulatedProgress = siblingInis.reduce((sum, ini) =>
                        sum + (ini.id === updatedIni.id ? newProgress : ini.progress), 0
                    );

                    const avgProgress = totalIni > 0 ? (accumulatedProgress / totalIni) : 0;

                    const kr = await tx.okrKeyResult.findUnique({
                        where: { id: updatedIni.keyResultId }
                    });

                    if (kr) {
                        const newKrVal = (avgProgress / 100) * kr.targetValue;
                        await tx.okrKeyResult.update({
                            where: { id: kr.id },
                            data: { currentValue: newKrVal }
                        });
                    }
                }
            }
        });

        return NextResponse.json({ success: true, message: 'Agile state committed successfully.' });
    } catch (error) {
        console.error('Drag and Drop Transaction Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
