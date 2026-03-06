import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
        }

        const data = await request.json();
        const prompt = data.prompt;

        if (!prompt) {
            return NextResponse.json({ error: 'Text prompt is required.' }, { status: 400 });
        }

        // Fetch Financial Metrics Context for Gemini
        // We will pull the last 30 days of data to give the AI context over recent velocity.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [orders, activeBatches, products] = await Promise.all([
            prisma.order.findMany({
                where: {
                    createdAt: { gte: thirtyDaysAgo },
                    status: { in: ['COMPLETED', 'SHIPPING', 'PAID', 'DELIVERED'] }
                },
                include: {
                    items: {
                        include: { product: true }
                    },
                    fulfillments: {
                        include: { items: true } // Items have computedCogs (FIFO Cost)
                    }
                }
            }),
            prisma.inventoryBatch.findMany({
                where: { status: 'ACTIVE' },
                include: { product: true }
            }),
            prisma.product.findMany({
                select: { id: true, name: true, sku: true, salePrice: true, stock: true }
            })
        ]);

        // Synthesize the massive DB snapshot into a digestible JSON string for Gemini
        // To save token context, we will pre-calculate some aggregations.

        const skuPerformance: Record<string, { name: string, revenue: number, unitsSold: number, cogs: number }> = {};
        let totalRevenue = 0;
        let totalCogs = 0;

        orders.forEach(order => {
            order.items.forEach(item => {
                const pId = item.productId || 'UNKNOWN';
                if (!skuPerformance[pId]) {
                    skuPerformance[pId] = { name: item.product?.name || item.productName || 'Unknown SKU', revenue: 0, unitsSold: 0, cogs: 0 };
                }
                const lineRevenue = item.quantity * item.price;
                skuPerformance[pId].revenue += lineRevenue;
                skuPerformance[pId].unitsSold += item.quantity;
                totalRevenue += lineRevenue;
            });

            order.fulfillments.forEach(fulfillment => {
                fulfillment.items.forEach(fi => {
                    const cogs = fi.computedCogs || 0;
                    totalCogs += cogs;
                    // Map COGS back to SKU Performance
                    const targetOrderItem = order.items.find(i => i.id === fi.orderItemId);
                    if (targetOrderItem) {
                        const pId = targetOrderItem.productId || 'UNKNOWN';
                        if (skuPerformance[pId]) skuPerformance[pId].cogs += cogs;
                    }
                });
            });
        });

        const activeDeadStock = activeBatches.map(b => ({
            sku: b.product.sku,
            name: b.product.name,
            remainingQty: b.remainingQuantity,
            unitCost: b.unitCost,
            totalLockedCapital: b.remainingQuantity * b.unitCost,
            expirationPassed: b.expirationDate ? (new Date(b.expirationDate) < new Date()) : false
        }));

        // The System Prompt Core
        const systemInstruction = `
        You are the GOPEAK Enterprise Financial Copilot (AI-CFO). 
        You analyze the following database snapshot of the last 30 days to answer the executive's question precisely.
        
        Context Data (Auto-Fetched):
        1. 30-Day Aggregated SKU Velocity: ${JSON.stringify(skuPerformance)}
        2. Total 30-Day Revenue (Gross): ฿${totalRevenue.toLocaleString()}
        3. Total 30-Day COGS (computed by strict FIFO algorithms): ฿${totalCogs.toLocaleString()}
        4. 30-Day Gross Margin: ฿${(totalRevenue - totalCogs).toLocaleString()} (${totalRevenue > 0 ? (((totalRevenue - totalCogs) / totalRevenue) * 100).toFixed(2) : 0}%)
        5. Active Inventory Batches (Capital lockup & FEFO status): ${JSON.stringify(activeDeadStock.slice(0, 50))} (Truncated)
        
        Rules:
        - Analyze the data and answer the user's prompt expertly.
        - Notice "Zombies" or dead-stock capital.
        - If the user asks for markdown advice, use the FEFO status and remaining units to calculate an optimal Discount % to liquidate the stock before taking a total loss.
        - Format the response using professional, easy-to-read Markdown. Use bold syntax, bullet points, and highlight key numbers. Keep it concise but deeply analytical.
        - Answer in Thai if the user asks in Thai. Default to the language of the prompt.
        `;

        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-pro-preview",
            systemInstruction: systemInstruction,
            generationConfig: {
                temperature: 0.2, // Low temp for financial accuracy
            }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({ response: responseText });

    } catch (error: any) {
        console.error('Error generating AI Copilot response:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
