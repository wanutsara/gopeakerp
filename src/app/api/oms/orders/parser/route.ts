import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { textData, base64Image } = await request.json();

        if (!textData) {
            return NextResponse.json({ error: 'Customer Chat / Text Data is required.' }, { status: 400 });
        }

        // 1. Fetch available SKUs to give Gemini context for fuzzy matching
        const availableProducts = await prisma.product.findMany({
            where: { parentId: null } // Simplified to parents/standalone for context brevity
        });

        const productCatalog = availableProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            salePrice: p.salePrice
        }));

        // 2. Format Image (if a bank slip is provided)
        let parts: any[] = [];
        const systemInstruction = `
You are the Zero-Click Logistics Parser for a Thai Enterprise ERP system.
Your job is to read raw, unstructured chat messages from customers (e.g. from LINE or Facebook Messenger) and strictly extract the data required to generate a canonical Database Invoice.

# Active Product Catalog (Match requested items to these ONLY):
${JSON.stringify(productCatalog, null, 2)}

# Objective
1. Identify the Customer Name (or guess a placeholder if missing).
2. Extract the exact Geographic Shipping Address. Parse it cleanly into standard Thai format (Province, District, Postal Code).
3. Identify what items the customer is ordering. Fuzzy-match their natural language to the Exact Product IDs in the catalog above.
4. Calculate the total required amount.
5. If an image (Bank Slip) is provided, verify visually if the transferred amount matches the required amount.
   
Respond STRICTLY in JSON format without markdown ticks.
{
  "customer": {
    "name": "string",
    "phone": "string | null",
    "address": "string",
    "province": "string",
    "district": "string",
    "postalCode": "string"
  },
  "items": [
    {
      "productId": "string (must exist in catalog)",
      "productName": "string",
      "quantity": number,
      "unitPrice": number
    }
  ],
  "financials": {
    "calculatedTotal": number,
    "slipVerifiedAmount": number | null,
    "isPaymentValid": boolean
  },
  "aiConfidenceScore": number,
  "technicalReasoning": "string"
}
`;

        parts.push({ text: systemInstruction });
        parts.push({ text: `\n\n--- CUSTOMER CHAT LOG ---\n${textData}` });

        if (base64Image) {
            let mimeType = 'image/jpeg';
            let base64Data = base64Image;

            if (base64Image.startsWith('data:')) {
                const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
                if (matches) {
                    mimeType = matches[1];
                    base64Data = matches[2];
                }
            }

            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            });
        }

        // 3. Multimodal Execution
        const generatedResult = await model.generateContent(parts);
        const responseText = generatedResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const aiInvoice = JSON.parse(responseText);

        // 4. Prisma Transaction: Generate the Customer and the Order automatically
        const createdOrder = await prisma.$transaction(async (tx) => {

            // Create or Find Customer (Simple creation for demo parser)
            const customer = await tx.customer.create({
                data: {
                    name: aiInvoice.customer.name || 'Social Commerce Guest',
                    phone: aiInvoice.customer.phone || null,
                    address: aiInvoice.customer.address,
                    province: aiInvoice.customer.province,
                    district: aiInvoice.customer.district,
                    postalCode: aiInvoice.customer.postalCode,
                }
            });

            // Create Order
            const orderStatus = aiInvoice.financials.isPaymentValid ? 'PAID' : 'PENDING';
            const order = await tx.order.create({
                data: {
                    customerId: customer.id,
                    channel: 'OTHER',
                    status: orderStatus,
                    subtotal: aiInvoice.financials.calculatedTotal,
                    shippingFee: 0,
                    total: aiInvoice.financials.calculatedTotal,
                    notes: `AI Generated via Omni-Channel Parser. Confidence: ${aiInvoice.aiConfidenceScore}/100.`
                }
            });

            // Create Order Items
            for (const item of aiInvoice.items) {
                await tx.orderItem.create({
                    data: {
                        orderId: order.id,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        price: item.unitPrice
                    }
                });
            }

            return order;
        });

        return NextResponse.json({
            message: 'Zero-Click Order Successfully Processed',
            aiAnalysis: aiInvoice,
            orderId: createdOrder.id
        });

    } catch (error: any) {
        console.error('LLM Parser Exception:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
