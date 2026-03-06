import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

type Action = "READ" | "WRITE" | "DELETE";
export type Module = "EXECUTIVE" | "OMS" | "FINANCE" | "HR";

export async function hasPermission(module: Module, action: Action = "READ"): Promise<boolean> {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) return false;

    // OWNER inherently possesses God Mode over all Workspaces
    if (session.user.role === "OWNER") return true;

    // Check custom dynamic permission array (JWT decodes into session)
    const permissions = (session.user as any).permissions || [];

    const modulePerm = permissions.find((p: any) => p.module === module);

    if (!modulePerm) return false; // Default deny if not explicitly granted

    switch (action) {
        case "READ": return !!modulePerm.canRead;
        case "WRITE": return !!modulePerm.canWrite;
        case "DELETE": return !!modulePerm.canDelete;
        default: return false;
    }
}

// Security Middleware to instantly terminate unauthorized API / Server Component access
export async function requirePermission(module: Module, action: Action = "READ") {
    const authorized = await hasPermission(module, action);
    if (!authorized) {
        throw new Error("UNAUTHORIZED_WORKSPACE_ACCESS: " + module);
    }
}
