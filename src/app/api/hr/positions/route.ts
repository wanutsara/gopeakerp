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

        // Must be HR/Manager level to view/edit Core HR metrics
        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const positions = await prisma.jobPosition.findMany({
            include: {
                _count: {
                    select: { employees: true },
                },
                competencies: {
                    include: {
                        competency: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(positions);
    } catch (error) {
        console.error('Error fetching job positions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Only OWNER can create Job Positions' }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, minSalary, maxSalary, competencies } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const newPosition = await prisma.jobPosition.create({
            data: {
                title,
                description,
                minSalary: minSalary || 0,
                maxSalary: maxSalary || 0,
            },
        });

        // Handle Competencies if provided
        if (competencies && Array.isArray(competencies) && competencies.length > 0) {
            // Create bindings
            const competencyPromises = competencies.map(async (comp: any) => {
                // First, ensure the competency exists or create it
                let competencyRecord = await prisma.competency.findUnique({
                    where: { name: comp.name },
                });

                if (!competencyRecord) {
                    competencyRecord = await prisma.competency.create({
                        data: { name: comp.name },
                    });
                }

                return prisma.jobPositionCompetency.create({
                    data: {
                        jobPositionId: newPosition.id,
                        competencyId: competencyRecord.id,
                        requiredLevel: comp.requiredLevel || 1,
                    },
                });
            });

            await Promise.all(competencyPromises);
        }

        return NextResponse.json(newPosition, { status: 201 });
    } catch (error) {
        console.error('Error creating job position:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
