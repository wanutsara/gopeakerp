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
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Fetch KR's assigned to this employee
        const myKeyResults = await prisma.okrKeyResult.findMany({
            where: { employeeId: employee.id },
            include: {
                objective: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by Objective for better UI rendering
        const groupedOkrs = myKeyResults.reduce((acc: Record<string, any>, kr: any) => {
            if (!acc[kr.objectiveId]) {
                acc[kr.objectiveId] = {
                    objective: kr.objective,
                    keyResults: []
                };
            }
            acc[kr.objectiveId].keyResults.push(kr);
            return acc;
        }, {});

        return NextResponse.json(Object.values(groupedOkrs));
    } catch (error) {
        console.error('Error fetching ESS OKRs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const employee = await prisma.employee.findUnique({ where: { userId: session.user.id } });
        if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        const { krId, newValue } = await request.json();
        if (!krId || newValue === undefined) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

        const kr = await prisma.okrKeyResult.findUnique({ where: { id: krId } });
        if (!kr || kr.employeeId !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const updatedKR = await prisma.okrKeyResult.update({
            where: { id: krId },
            data: { currentValue: Number(newValue) }
        });

        // Trigger Gamification EXP based on progress updates (e.g. 5 EXP per % updated)
        // This is a simplified gamification hook for OKR progress
        if (Number(newValue) > kr.currentValue) {
            const difference = Number(newValue) - kr.currentValue;
            // E.g. 1 unit of KR = 2 EXP. Adjust as needed.
            const genericExpGain = Math.abs(Math.round(difference * 2));

            const newExp = employee.exp + genericExpGain;
            const expThreshold = employee.level * 100;
            let targetLevel = employee.level;
            let finalExp = newExp;

            if (newExp >= expThreshold) {
                targetLevel += 1;
                finalExp = newExp - expThreshold;
            }

            await prisma.employee.update({
                where: { id: employee.id },
                data: { exp: finalExp, level: targetLevel }
            });
        }

        return NextResponse.json(updatedKR);
    } catch (error) {
        console.error('Error updating KR progress:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
