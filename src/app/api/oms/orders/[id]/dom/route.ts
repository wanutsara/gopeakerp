import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const unwrappedParams = await params;
        const orderId = unwrappedParams.id;

        // Fetch Order Context
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                items: { include: { product: true } },
                fulfillments: { include: { items: true } }
            }
        });

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        // Filter out items that are already fulfilled manually
        const alreadyFulfilledItemIds = order.fulfillments.flatMap(f => f.items.map(fi => fi.orderItemId));
        const unfulfilledItems = order.items.filter(i => !alreadyFulfilledItemIds.includes(i.id));

        if (unfulfilledItems.length === 0) {
            return NextResponse.json({ error: 'All items are already routed globally.' }, { status: 400 });
        }

        // Fetch Real-time Global Inventory Matrices for THESE specific products
        const productIds = unfulfilledItems.map(i => i.productId).filter(Boolean) as string[];
        const locations = await prisma.location.findMany({
            include: {
                inventoryLevels: {
                    where: { productId: { in: productIds } }
                }
            }
        });

        // Construct the AI Context Prompt
        const systemPrompt = `
You are the primary Logistical AI (DOM Engine) for an Enterprise ERP system. 
Your objective is to determine the optimal multi-warehouse routing strategy to fulfill the pending Order items.

# Customer Profile
Name: ${order.customer?.name || 'Guest'}
Location: ${order.customer?.address || 'Unknown'} - Province: ${order.customer?.province || 'Unknown'} (ZIP: ${order.customer?.postalCode || 'Unknown'})

# Required Items to Ship
${JSON.stringify(unfulfilledItems.map(i => ({ orderItemId: i.id, productName: i.productName, sku: i.product?.sku || 'Unknown', qtyReq: i.quantity })), null, 2)}

# Global Inventory Matrices (Warehouses)
${JSON.stringify(locations.map(loc => ({
            locationId: loc.id,
            name: loc.name,
            type: loc.type,
            stockLevels: loc.inventoryLevels.map(inv => ({ productId: inv.productId, available: inv.available }))
        })), null, 2)}

# Objective
1. Fulfill EVERY Required Item.
2. Minimize the number of split shipments (1 box is better than 2).
3. Prioritize shipping from a warehouse geographically closest to the Customer's Province if possible.
4. If an item is completely out of stock globally, mark it as 'Cannot Fulfill'.

Output STRICTLY valid JSON ONLY without markdown wrappers. 
Format expected:
{
  "routingDecisions": [
    {
       "locationId": "string",
       "locationName": "string",
       "reasoning": "string",
       "packages": [
           { "orderItemId": "string", "quantity": number }
       ]
    }
  ],
  "unroutableItems": [
    { "orderItemId": "string", "reason": "Out of stock globally" }
  ]
}
`;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const aiDomResult = JSON.parse(responseText);

        // Transactionally execute the AI's logistical decisions
        let newFulfillments: any[] = [];

        await prisma.$transaction(async (tx) => {
            for (const route of aiDomResult.routingDecisions) {
                if (route.packages.length === 0) continue;

                const fulfillment = await tx.fulfillment.create({
                    data: {
                        orderId: order.id,
                        locationId: route.locationId || null,
                        status: 'PACKING',
                        courier: 'AI-Designated Courier' // Could be further optimized by LLM
                    }
                });

                for (const pkg of route.packages) {
                    await tx.fulfillmentItem.create({
                        data: {
                            fulfillmentId: fulfillment.id,
                            orderItemId: pkg.orderItemId,
                            quantity: pkg.quantity
                        }
                    });
                }
                newFulfillments.push(fulfillment);
            }
        });

        return NextResponse.json({
            message: 'AI successfully distributed global shipments.',
            decisions: aiDomResult,
            fulfillmentsGenerated: newFulfillments.length
        });

    } catch (error: any) {
        console.error('AI Routing Engine Exception:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
