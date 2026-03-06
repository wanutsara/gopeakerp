import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini 1.5 Pro for Multimodal Vision
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderItemId, base64Image, customerReason } = await request.json();

        if (!orderItemId || !base64Image) {
            return NextResponse.json({ error: 'Missing required evidence or OrderItem reference.' }, { status: 400 });
        }

        // 1. Fetch the Order Item Context
        const orderItem = await prisma.orderItem.findUnique({
            where: { id: orderItemId },
            include: { order: true, product: true }
        });

        if (!orderItem) return NextResponse.json({ error: 'OrderItem not found' }, { status: 404 });

        // 2. Format the Base64 String for Gemini (Strip data URI headers if present)
        let mimeType = 'image/jpeg';
        let base64Data = base64Image;

        if (base64Image.startsWith('data:')) {
            const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        // 3. Construct the Vision AI Prompt
        const systemPrompt = `
You are the elite Level-3 Quality Assurance AI (Vision RMA Engine) for an Enterprise ERP system.
Your objective is to inspect a customer's requested product return, evaluate the visible damage, and mandate how the Warehouse should handle the reverse logistics.

# Context
Product Scheduled for Return: ${orderItem.productName}
Customer's Stated Reason: "${customerReason || 'Defective / Unwanted'}"

# Instructions
1. Inspect the provided image thoroughly.
2. Determine if there is visible physical damage (scratches, tears, water damage, broken seals).
3. Calculate a precise Damage Severity Score (0 = Flawless, 10 = Completely Destroyed).
4. Issue a definitive "Restock Verdict":
   - "RESTOCK" (if unopened/flawless, can be sold tracking normal inventory).
   - "QUARANTINE" (if damaged, missing parts, or requires human repair/disposal).
5. Output a short technical summary justifying your decision.

Respond STRICTLY in JSON format without markdown ticks.
Format:
{
  "damageSeverityScore": number,
  "restockVerdict": "RESTOCK" | "QUARANTINE",
  "technicalSummary": "string",
  "fraudProbability": "LOW" | "MEDIUM" | "HIGH"
}
`;

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };

        // Execute Multimodal Analysis
        const generatedResult = await model.generateContent([
            systemPrompt,
            imagePart
        ]);

        const responseText = generatedResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const aiAnalysis = JSON.parse(responseText);

        // Transactionally register the ReturnRequest based on AI Verdict (Admin must still approve it)
        const returnReq = await prisma.$transaction(async (tx) => {
            const newReturn = await tx.returnRequest.create({
                data: {
                    orderId: orderItem.orderId,
                    status: 'PENDING',
                    aiConditionReport: JSON.stringify(aiAnalysis),
                    aiDamageScore: aiAnalysis.damageSeverityScore || 0
                }
            });

            await tx.returnItem.create({
                data: {
                    returnId: newReturn.id,
                    orderItemId: orderItem.id,
                    quantity: 1, // Defaulting to returning 1 unit of this line item
                    condition: aiAnalysis.restockVerdict === 'QUARANTINE' ? 'DAMAGED' : 'SELLABLE'
                }
            });

            return newReturn;
        });

        return NextResponse.json({
            message: 'RMA Processed and Auto-Graded by Vision AI.',
            analysis: aiAnalysis,
            returnId: returnReq.id
        });

    } catch (error: any) {
        console.error('Vision RMA Exception:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
