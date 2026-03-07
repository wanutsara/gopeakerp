import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Awaiting params for Next.js 15
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const user = await prisma.user.findFirst({
            where: { email: { equals: session.user.email!, mode: 'insensitive' } }
        });

        if (user?.role !== 'MANAGER' && user?.role !== 'OWNER') {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await request.json();
        const { name, taxId, legalName, registeredAddress, logoUrl, isHQ, branchCode } = body;

        // Next.js 15: Await params
        const resolvedParams = await params;

        const brand = await prisma.companyBrand.update({
            where: { id: resolvedParams.id },
            data: {
                name,
                taxId,
                legalName,
                registeredAddress,
                logoUrl,
                isHQ,
                branchCode
            }
        });

        return NextResponse.json(brand);

    } catch (error) {
        console.error("Brands PUT Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const user = await prisma.user.findFirst({
            where: { email: { equals: session.user.email!, mode: 'insensitive' } }
        });

        if (user?.role !== 'MANAGER' && user?.role !== 'OWNER') {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const resolvedParams = await params;

        await prisma.companyBrand.delete({
            where: { id: resolvedParams.id },
        });

        return new NextResponse("Deleted", { status: 200 });

    } catch (error) {
        console.error("Brands DELETE Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
