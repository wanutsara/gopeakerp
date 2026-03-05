import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { status, health } = await request.json();
        const { id: initiativeId } = await params;

        const isManager = ['OWNER', 'MANAGER', 'HR'].includes(session.user.role);

        // Fetch existing Initiative to check Ownership
        const existingInitiative = await prisma.initiative.findUnique({
            where: { id: initiativeId },
            include: { owner: true }
        });

        if (!existingInitiative) {
            return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
        }

        const isOwner = session.user.id === existingInitiative.owner.userId;

        // Managers can edit anything. Owners can edit their own Initiatives' Health, but completion might require Manager sign off.
        if (!isManager && !isOwner) {
            return NextResponse.json({ error: 'Forbidden. You do not own this Action Plan.' }, { status: 403 });
        }

        let updateData: any = {};

        if (health) {
            updateData.health = health;
        }

        if (status) {
            // If the Employee tries to complete it, move to REVIEWING so Manager can sign off
            if (status === 'COMPLETED' && !isManager) {
                updateData.status = 'REVIEWING';
            } else {
                updateData.status = status;
            }
        }

        const updatedInitiative = await prisma.initiative.update({
            where: { id: initiativeId },
            data: updateData
        });

        // If a Manager signs off and officially COMPLETED the Initiative, award the EXP and Coins to the Owner!
        if (updatedInitiative.status === 'COMPLETED' && existingInitiative.status !== 'COMPLETED') {
            await prisma.employee.update({
                where: { id: existingInitiative.owner.id },
                data: {
                    exp: { increment: existingInitiative.expReward },
                    coins: { increment: existingInitiative.coinReward }
                }
            });

            // Additionally, auto-bubble the completed value to the Parent KeyResult (e.g. assume completion hits the target)
            // For now we just sync the progress
            await prisma.okrKeyResult.update({
                where: { id: existingInitiative.keyResultId },
                data: {
                    currentValue: { increment: 1 } // Simplified metric increment depending on KR design
                }
            });
        }

        return NextResponse.json(updatedInitiative);
    } catch (error) {
        console.error('Error updating Initiative:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
