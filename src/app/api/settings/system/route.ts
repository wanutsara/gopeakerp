import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let setting = await prisma.companySetting.findFirst();

        // Auto-initialize if not exist
        if (!setting) {
            setting = await prisma.companySetting.create({
                data: {
                    defaultLat: null,
                    defaultLng: null,
                    defaultRadius: 100,
                    defaultWorkStart: '09:00',
                    defaultWorkEnd: '18:00',
                    defaultLogicalCutoff: '04:00',
                    gracePeriodMinutes: 15,
                    strictOutboundCutoff: true,
                    financeGoLiveDate: null,
                }
            });
        }

        return NextResponse.json(setting);
    } catch (error: any) {
        console.error('API /settings/system GET error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { financeGoLiveDate, defaultLogicalCutoff, gracePeriodMinutes, strictOutboundCutoff } = body;

        let setting = await prisma.companySetting.findFirst();

        if (setting) {
            setting = await prisma.companySetting.update({
                where: { id: setting.id },
                data: {
                    financeGoLiveDate: financeGoLiveDate ? new Date(financeGoLiveDate) : null,
                    defaultLogicalCutoff: defaultLogicalCutoff || '04:00',
                }
            });
        } else {
            setting = await prisma.companySetting.create({
                data: {
                    financeGoLiveDate: financeGoLiveDate ? new Date(financeGoLiveDate) : null,
                    defaultLogicalCutoff: defaultLogicalCutoff || '04:00',
                }
            });
        }

        return NextResponse.json({ success: true, setting });
    } catch (error: any) {
        console.error('API /settings/system PUT error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
