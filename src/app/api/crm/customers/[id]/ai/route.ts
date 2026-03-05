import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!genAI) {
            return NextResponse.json({ error: 'Gemini API is not configured' }, { status: 503 });
        }

        const { id: customerId } = await params;

        // Fetch deep customer data again for prompt construction
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: { items: true }
                }
            }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const orders = customer.orders;
        const frequency = orders.length;
        if (frequency === 0) {
            return NextResponse.json({
                error: 'Customer has no transactions to analyze. Please wait until they make a purchase.'
            }, { status: 400 });
        }

        const ltv = Number(customer.totalSpent || 0);
        const aov = ltv / frequency;
        const lastOrderDate = new Date(orders[0].createdAt);
        const timeDiff = Math.abs(new Date().getTime() - lastOrderDate.getTime());
        const recencyDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

        const promptPayload = `
You are an elite E-commerce Retentional Marketer AI working in a CDP (Customer Data Platform).
Analyze the following customer and return EXACTLY a JSON response. Do not use markdown blocks. Keep sentences extremely sharp and professional. No pleasantries.
IMPORTANT: You MUST write the 'psychologicalProfile' and 'nextBestAction' in the THAI LANGUAGE (ภาษาไทย). The 'churnRisk' must remain in ENGLISH (LOW/MEDIUM/HIGH).

Customer Name: ${customer.name || 'Unknown'}
Total Spent (LTV): ${ltv} THB
Average Order Value (AOV): ${Math.round(aov)} THB
Total Orders: ${frequency}
Days since last purchase: ${recencyDays}
Channel preferences: ${customer.source || 'Unknown'}

Transaction History (SKUs bought):
${orders.slice(0, 50).map((o: any) => `- Date: ${new Date(o.createdAt).toISOString().split('T')[0]}, Total: ${Number(o.total)} THB, Items: ${o.items.map((i: any) => i.productName || i.sku).join(', ')}`).join('\n')}

Output format MUST pure JSON matching:
{
  "psychologicalProfile": "A 2-sentence summary of what this person buys and their behavioral spending pattern (e.g. loves discounts, seasonal buyer, high-end impulse buyer).",
  "churnRisk": "LOW" | "MEDIUM" | "HIGH",
  "nextBestAction": "The exact 1-sentence marketing pitch or tactical action the Admin should do *right now* to get more money out of them or prevent them from churning."
}
`;

        const result = await model.generateContent(promptPayload);
        let jsonText = result.response.text().trim();

        // Clean markdown artifacts
        if (jsonText.startsWith('\`\`\`json')) jsonText = jsonText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
        else if (jsonText.startsWith('\`\`\`')) jsonText = jsonText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();

        const aiInsights = JSON.parse(jsonText);

        // Mutate the database to glue these insights to the Customer row
        // @ts-ignore - TS Cache is stale
        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                aiPsychology: aiInsights.psychologicalProfile,
                aiNextAction: aiInsights.nextBestAction,
                aiChurnRisk: aiInsights.churnRisk,
                aiLastSync: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            message: 'AI successfully analyzed historical footprint.',
            insights: {
                psychologicalProfile: updatedCustomer.aiPsychology,
                nextBestAction: updatedCustomer.aiNextAction,
                churnRisk: updatedCustomer.aiChurnRisk,
                lastSync: updatedCustomer.aiLastSync
            }
        });

    } catch (error: any) {
        console.error('Gemini Subroutine Error:', error);
        return NextResponse.json({ error: error.message || 'AI processing encountered a critical fault.' }, { status: 500 });
    }
}
