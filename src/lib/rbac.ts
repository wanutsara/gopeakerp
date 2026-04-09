import { prisma } from "@/lib/prisma";

export type Module = "HR" | "FINANCE" | "OMS" | "CRM" | "ATTENDANCE" | "PAYROLL" | "EMPLOYEES" | "EXPENSES" | "SYSTEM" | string;

export async function checkPermission(
    userId: string | undefined,
    module: string,
    action: 'canRead' | 'canWrite' | 'canDelete'
): Promise<boolean> {
    if (!userId) return false;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { userRole: { include: { permissions: true } } }
        });

        if (!user) return false;

        // OWNER bypass: If the user is explicitly set as OWNER role, they can bypass.
        if (user.role === "OWNER") return true;

        if (!user.userRole) return false;

        const permission = user.userRole.permissions.find(p => p.module === module);
        if (!permission) return false;

        return permission[action];
    } catch (error) {
        console.error("RBAC Enforcement Error:", error);
        return false;
    }
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function requirePermission(module: string, action: 'READ' | 'WRITE' | 'DELETE' = 'READ') {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const mAction = action === 'WRITE' ? 'canWrite' : action === 'DELETE' ? 'canDelete' : 'canRead';

    const hasPerm = await checkPermission(session.user.id, module, mAction);
    
    if (!hasPerm) {
        throw new Error(`Forbidden: Missing required ${action} permission for module ${module}`);
    }
    
    return true;
}
