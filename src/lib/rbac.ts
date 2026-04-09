import { prisma } from "@/lib/prisma";

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
