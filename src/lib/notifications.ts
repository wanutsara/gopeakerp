import { prisma } from "./prisma";
import { Module } from "./rbac";

export type NotificationType =
    | 'OVERTIME_REQUEST'
    | 'LEAVE_REQUEST'
    | 'ATTENDANCE_REQUEST'
    | 'EXPENSE_REQUEST'
    | 'ANNOUNCEMENT'
    | 'GOAL_ASSIGNED'
    | 'SYSTEM';

/**
 * Enterprise Targeted Notification Delivery System
 * Routes notifications to the correct personnel based on direct management or Dynamic RBAC matrices.
 */
export async function sendTargetedNotification({
    title,
    message,
    type,
    referenceId,
    targetEmployeeId,
    managerId,
    fallbackModule,
}: {
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: string;

    // 1. Send strictly to a specific Employee (e.g. returning approval status back to the requester)
    targetEmployeeId?: string;

    // 2. Send strictly to the direct Manager of the requester
    managerId?: string;

    // 3. If no manager exists, fallback to users who have WRITE access to this Enterprise Module
    fallbackModule?: Module;
}) {
    // Stage 1: Absolute Directed Delivery (Employee)
    if (targetEmployeeId) {
        const emp = await prisma.employee.findUnique({ where: { id: targetEmployeeId }, include: { user: true } });
        if (emp?.user) {
            await prisma.notification.create({
                data: { userId: emp.user.id, title, message, type, referenceId }
            });
        }
        return;
    }

    // Stage 2: Hierarchical Delivery (Direct Manager)
    if (managerId) {
        const manager = await prisma.employee.findUnique({ where: { id: managerId }, include: { user: true } });
        if (manager?.user) {
            await prisma.notification.create({
                data: { userId: manager.user.id, title, message, type, referenceId }
            });
            return; // Delivery successful, prevent fallbacks
        }
    }

    // Stage 3: Dynamic RBAC Fallback (Module Administrators)
    if (fallbackModule) {
        const fallbackUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'OWNER' }, // Supreme fallback
                    {
                        userRole: {
                            permissions: {
                                some: {
                                    module: fallbackModule,
                                    canWrite: true
                                }
                            }
                        }
                    }
                ]
            }
        });

        const uniqueUserIds = [...new Set(fallbackUsers.map(u => u.id))];

        for (const uid of uniqueUserIds) {
            await prisma.notification.create({
                data: { userId: uid, title, message, type, referenceId }
            });
        }
    } else {
        // Stage 4: Absolute Fallback (OWNER only)
        const owners = await prisma.user.findMany({ where: { role: 'OWNER' } });
        for (const owner of owners) {
            await prisma.notification.create({
                data: { userId: owner.id, title, message, type, referenceId }
            });
        }
    }
}
