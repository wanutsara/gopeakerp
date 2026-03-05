import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const objectiveId = params.id;
        const body = await request.json();

        const { title, description, year, quarter, keyResults } = body;

        // Update the objective itself
        const updatedObjective = await prisma.okrObjective.update({
            where: { id: objectiveId },
            data: {
                title,
                description,
                year: parseInt(year) || undefined,
                quarter: parseInt(quarter) || undefined,
            }
        });

        // Recreate key results fully to ensure sync
        if (keyResults && Array.isArray(keyResults)) {
            // Remove existing key results and re-create them. 
            // Note: If you want to strictly UPDATE them instead to preserve currentValue/progress, use an upsert via IDs. 
            // For now, let's gracefully update KRs that exist and create new ones.

            // Collect incoming KR IDs that are valid
            const activeKrIds = keyResults.map((kr: any) => kr.id).filter(Boolean);

            // Delete KRs that are no longer in the payload
            await prisma.okrKeyResult.deleteMany({
                where: {
                    objectiveId,
                    id: { notIn: activeKrIds }
                }
            });

            // Upsert the ones provided
            for (const kr of keyResults) {
                if (!kr.title) continue;

                if (kr.id) {
                    await prisma.okrKeyResult.update({
                        where: { id: kr.id },
                        data: {
                            title: kr.title,
                            targetValue: Number(kr.targetValue) || 100,
                            unit: kr.unit || '%',
                            employeeId: kr.employeeId || null,
                        }
                    });
                } else {
                    await prisma.okrKeyResult.create({
                        data: {
                            objectiveId,
                            title: kr.title,
                            targetValue: Number(kr.targetValue) || 100,
                            unit: kr.unit || '%',
                            employeeId: kr.employeeId || null,
                        }
                    });
                }
            }
        }

        return NextResponse.json(updatedObjective, { status: 200 });
    } catch (error) {
        console.error('Error updating OKR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const objectiveId = params.id;

        // Rely upon onDelete: Cascade in prisma schema to auto-delete KRs
        await prisma.okrObjective.delete({
            where: { id: objectiveId }
        });

        return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting OKR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
