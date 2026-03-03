import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

type Action = "READ" | "WRITE" | "DELETE";
type Module = "HR" | "PAYROLL" | "LEAVE" | "CRM" | "INVENTORY" | "SETTINGS";

export async function hasPermission(module: Module, action: Action = "READ"): Promise<boolean> {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) return false;

    // OWNER has full access to everything
    if (session.user.role === "OWNER") return true;

    // MANAGER has default access to everything unless restricted (Implementation choice)
    // We'll treat MANAGER as having full access for now, but in a strict RBAC, they'd need a userRoleId too.
    if (session.user.role === "MANAGER" && !(session.user as any).permissions) return true;

    // Check custom permissions
    const permissions = (session.user as any).permissions || [];

    const modulePerm = permissions.find((p: any) => p.module === module);

    if (!modulePerm) return false; // Default deny

    switch (action) {
        case "READ": return !!modulePerm.canRead;
        case "WRITE": return !!modulePerm.canWrite;
        case "DELETE": return !!modulePerm.canDelete;
        default: return false;
    }
}

// Helper to quickly bounce unauthorized API requests
export async function requirePermission(module: Module, action: Action = "READ") {
    const authorized = await hasPermission(module, action);
    if (!authorized) {
        throw new Error("Unauthorized access to module: " + module);
    }
}
