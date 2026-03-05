import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Fetch all Initiatives assigned to the user or all if Manager
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const unparsedUrl = new URL(request.url);
        const employeeIdParam = unparsedUrl.searchParams.get('employeeId');

        // Identify the current employee mapping
        const currentEmployee = await prisma.employee.findFirst({
            where: { userId: session.user.id },
            select: { id: true }
        });

        const isManager = ['OWNER', 'MANAGER', 'HR'].includes(session.user.role);

        let whereClause: any = {};

        // If a specific employee is requested, and requester is Manager, fetch for that employee
        if (employeeIdParam && isManager) {
            whereClause.ownerId = employeeIdParam;
        } else if (!isManager) {
            // Normal employees can only see their own Initiatives or ones they collaborate on
            if (!currentEmployee) {
                return NextResponse.json({ error: 'Employee profile not mapped' }, { status: 400 });
            }
            whereClause = {
                OR: [
                    { ownerId: currentEmployee.id },
                    { collaborators: { some: { id: currentEmployee.id } } }
                ]
            };
        }

        const initiatives = await prisma.initiative.findMany({
            where: whereClause,
            include: {
                keyResult: {
                    include: { objective: true }
                },
                owner: {
                    include: { user: { select: { name: true, image: true, email: true } } }
                },
                collaborators: {
                    include: { user: { select: { name: true, image: true } } }
                },
                quests: {
                    select: { id: true, title: true, status: true, expReward: true, coinReward: true }
                }
            },
            orderBy: { endDate: 'asc' }
        });

        return NextResponse.json(initiatives);
    } catch (error) {
        console.error('Error fetching initiatives', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Create a new Initiative (Action Plan)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, keyResultId, ownerId, startDate, endDate, expReward, coinReward, collaboratorIds } = body;

        if (!title || !keyResultId || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const isManager = ['OWNER', 'MANAGER'].includes(session.user.role);

        // Identify the current employee calling this
        const currentEmployee = await prisma.employee.findFirst({
            where: { userId: session.user.id }
        });

        // Determine who the Owner of the Initiative is
        let assignedOwnerId = ownerId;

        // If no explicit owner passed, default toself
        if (!assignedOwnerId) {
            if (!currentEmployee) return NextResponse.json({ error: 'Employee mapping required to self-assign' }, { status: 400 });
            assignedOwnerId = currentEmployee.id;
        } else {
            // If assigning to someone else, must be a manager
            if (!isManager && assignedOwnerId !== currentEmployee?.id) {
                return NextResponse.json({ error: 'Only Managers can delegate Initiatives to other employees' }, { status: 403 });
            }
        }

        // Connect collaborators if array is provided
        const collaboratorsConnect = collaboratorIds && Array.isArray(collaboratorIds)
            ? collaboratorIds.map((id: string) => ({ id }))
            : [];

        const newInitiative = await prisma.initiative.create({
            data: {
                title,
                description,
                keyResultId,
                ownerId: assignedOwnerId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                expReward: expReward ? parseInt(expReward) : 500,
                coinReward: coinReward ? parseInt(coinReward) : 100,
                collaborators: {
                    connect: collaboratorsConnect
                }
            },
            include: {
                keyResult: true,
                owner: { include: { user: true } }
            }
        });

        return NextResponse.json(newInitiative, { status: 201 });
    } catch (error) {
        console.error('Error creating initiative', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
