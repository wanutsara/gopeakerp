import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
    try {
        await requirePermission("SETTINGS", "READ");
        const roles = await prisma.userRole.findMany({
            include: {
                permissions: true,
                _count: {
                    select: { users: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(roles);
    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await requirePermission("SETTINGS", "WRITE");
        const body = await request.json();
        const { name, description, permissions } = body;

        if (!name) {
            return NextResponse.json({ error: "Role name is required" }, { status: 400 });
        }

        // Validate unique name
        const existing = await prisma.userRole.findUnique({ where: { name } });
        if (existing) {
            return NextResponse.json({ error: "Role name already exists" }, { status: 400 });
        }

        const role = await prisma.userRole.create({
            data: {
                name,
                description,
                permissions: {
                    create: permissions.map((p: any) => ({
                        module: p.module,
                        canRead: p.canRead || false,
                        canWrite: p.canWrite || false,
                        canDelete: p.canDelete || false,
                    }))
                }
            },
            include: {
                permissions: true
            }
        });

        await prisma.activityLog.create({
            data: {
                action: "CREATE",
                entity: "USER_ROLE",
                entityId: role.id,
                details: `Created new role: ${role.name}`,
            }
        });

        return NextResponse.json(role);
    } catch (error) {
        console.error("Error creating role:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
