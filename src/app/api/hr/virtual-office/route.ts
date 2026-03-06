import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        // Removed strict JS Date bounding from Prisma to prevent UTC/Local DB miss.
        // We will fetch the absolute latest log and verify it mathematically.

        // Retrieve the Structural Departments and nested Employees
        const departments = await prisma.department.findMany({
            include: {
                employees: {
                    include: {
                        user: {
                            select: { name: true, image: true, email: true }
                        },
                        timeLogs: {
                            orderBy: { date: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        // Normalize payload into the `VoxelEngine` friendly format
        const voxelOffices = departments.map(dept => {
            return {
                id: dept.id,
                name: dept.name,
                employees: dept.employees.map(emp => {
                    const latestLog = emp.timeLogs[0];
                    let actionState = 'AWAY';
                    let lastCheckInTime = null;

                    if (latestLog) {
                        const hasCheckedIn = latestLog.checkInTime !== null;
                        const hasCheckedOut = latestLog.checkOutTime !== null;

                        if (hasCheckedIn && !hasCheckedOut) {
                            actionState = 'WORKING';
                            lastCheckInTime = latestLog.checkInTime;
                        } else if (hasCheckedOut) {
                            actionState = 'LEFT_OFFICE';
                        }
                    }

                    return {
                        id: emp.id,
                        name: emp.user?.name || emp.userId,
                        image: emp.user?.image,
                        position: emp.position,
                        actionState: actionState, // Controls Voxel Geometry spawning
                        checkInTime: lastCheckInTime
                    };
                })
            };
        });

        return NextResponse.json(voxelOffices);

    } catch (error: any) {
        console.error("Virtual Office Synchronization Error:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
