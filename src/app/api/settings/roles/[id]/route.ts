import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, description, permissions } = body;

        // Ensure role exists
        const existing = await prisma.userRole.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        // Update basic info and recreate permissions
        const updatedRole = await prisma.userRole.update({
            where: { id },
            data: {
                name,
                description,
                permissions: {
                    deleteMany: {}, // Clear old
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
                action: "UPDATE",
                entity: "USER_ROLE",
                entityId: updatedRole.id,
                details: `Updated role: ${updatedRole.name}`,
            }
        });

        return NextResponse.json(updatedRole);
    } catch (error) {
        console.error("Error updating role:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if role is in use
        const existingUsersCount = await prisma.user.count({ where: { userRoleId: id } });
        if (existingUsersCount > 0) {
            return NextResponse.json({ error: "Cannot delete role because it is assigned to users" }, { status: 400 });
        }

        const role = await prisma.userRole.delete({
            where: { id }
        });

        await prisma.activityLog.create({
            data: {
                action: "DELETE",
                entity: "USER_ROLE",
                entityId: role.id,
                details: `Deleted role: ${role.name}`,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting role:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
