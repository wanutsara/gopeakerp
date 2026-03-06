import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await request.json();
        const { name, type, address, isDefault } = body;

        // Ensure params.id is awaited or extracted securely in Next 15+ 
        const { id } = await Promise.resolve(params);

        if (isDefault) {
            await prisma.location.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        const location = await prisma.location.update({
            where: { id },
            data: { name, type, address, isDefault }
        });

        return NextResponse.json({ success: true, location });
    } catch (error) {
        console.error('Failed to update location:', error);
        return NextResponse.json({ success: false, error: 'Failed to update location' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const target = await prisma.location.findUnique({ where: { id } });
        if (!target) return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });

        if (target.isDefault) {
            return NextResponse.json({ success: false, error: 'Cannot delete the Default Main Warehouse. Change another location to default first.' }, { status: 400 });
        }

        await prisma.location.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Location deleted successfully' });
    } catch (error) {
        console.error('Failed to delete location:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete location' }, { status: 500 });
    }
}
