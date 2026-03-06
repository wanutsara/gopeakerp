import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const user = await prisma.user.findUnique({
            where: { email: session.user.email! }
        });

        let brands;

        if (user?.role === 'ADMIN' || user?.role === 'OWNER') {
            brands = await prisma.companyBrand.findMany({
                orderBy: { isHQ: 'desc' }
            });
        } else {
            const access = await prisma.userBrandAccess.findMany({
                where: { userId: user?.id },
                include: { companyBrand: true }
            });
            brands = access.map((a: any) => a.companyBrand).sort((a: any, b: any) => (a.isHQ === b.isHQ ? 0 : a.isHQ ? -1 : 1));
        }

        return NextResponse.json(brands);

    } catch (error) {
        console.error("Brands GET Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
