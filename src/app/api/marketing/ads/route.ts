import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const campaigns = await (prisma as any).marketingCampaign.findMany({
            include: {
                logs: { orderBy: { date: 'desc' }, take: 30 }
            },
            orderBy: { startDate: 'desc' }
        });
        return NextResponse.json(campaigns);
    } catch (error) {
        console.error('Error fetching marketing data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { action } = body;

        // Action 1: Create a new Campaign
        if (action === 'CREATE_CAMPAIGN') {
            const { name, platform, dailyBudget, startDate, endDate } = body;
            const newCampaign = await (prisma as any).marketingCampaign.create({
                data: {
                    name,
                    platform,
                    dailyBudget: Number(dailyBudget) || 0,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : null,
                }
            });
            return NextResponse.json({ message: 'Campaign created', campaign: newCampaign });
        }

        // Action 2: Add Ad Spend Log
        if (action === 'ADD_LOG') {
            const { campaignId, date, spend, impressions, clicks, conversions } = body;
            const logDate = new Date(date);

            // Upsert the log for that date
            const log = await (prisma as any).adSpendLog.upsert({
                where: {
                    campaignId_date: {
                        campaignId,
                        date: logDate
                    }
                },
                update: {
                    spend: Number(spend) || 0,
                    impressions: Number(impressions) || 0,
                    clicks: Number(clicks) || 0,
                    conversions: Number(conversions) || 0
                },
                create: {
                    campaignId,
                    date: logDate,
                    spend: Number(spend) || 0,
                    impressions: Number(impressions) || 0,
                    clicks: Number(clicks) || 0,
                    conversions: Number(conversions) || 0
                }
            });

            // Recalculate Total Spend for the Campaign (optimization trigger)
            const allLogs = await (prisma as any).adSpendLog.findMany({ where: { campaignId } });
            const totalSpend = allLogs.reduce((acc: number, l: any) => acc + l.spend, 0);

            await (prisma as any).marketingCampaign.update({
                where: { id: campaignId },
                data: { totalSpend }
            });

            return NextResponse.json({ message: 'Log added successfully', log });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Error with Marketing API:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
