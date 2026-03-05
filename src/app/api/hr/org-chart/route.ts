import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER' && session.user.role !== 'HR')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const employees = await prisma.employee.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                managerId: true,
                level: true,
                exp: true,
                user: { select: { name: true, image: true, email: true } },
                jobPosition: { select: { title: true } },
                department: { select: { name: true } }
            }
        });

        return NextResponse.json(employees);
    } catch (error) {
        console.error('Error fetching org chart data:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Drag-and-drop structural changes require high-level authorization
        if (!session || !session.user || (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { employeeId, newManagerId } = await request.json();

        if (!employeeId) return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });

        // Cycle Detection Mechanism
        // Prevent setting a manager whose own manager loop links back to this employee.
        if (newManagerId) {
            if (newManagerId === employeeId) {
                return NextResponse.json({ error: 'An employee cannot be their own manager.' }, { status: 400 });
            }

            let currentManagerCheck = newManagerId;
            const cyclePath = new Set<string>();
            while (currentManagerCheck) {
                if (currentManagerCheck === employeeId) {
                    return NextResponse.json({ error: 'Cycle detected: this move would create an infinite reporting loop.' }, { status: 400 });
                }
                const upperManager = await prisma.employee.findUnique({
                    where: { id: currentManagerCheck },
                    select: { managerId: true }
                });

                if (!upperManager || !upperManager.managerId) break;

                if (cyclePath.has(upperManager.managerId)) break; // Stop if db loop exists
                cyclePath.add(upperManager.managerId);

                currentManagerCheck = upperManager.managerId;
            }
        }

        const updatedEmployee = await prisma.employee.update({
            where: { id: employeeId },
            data: { managerId: newManagerId || null }
        });

        return NextResponse.json(updatedEmployee);
    } catch (error) {
        console.error('Error updating org chart hierarchy:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
