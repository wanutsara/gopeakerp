import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure this environment variable exists in your .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "System Error: Missing GEMINI_API_KEY in Environment. Please update your .env file." }, { status: 500 });
    }

    try {
        const { id } = await params;
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No document specified for Gemini Vision OCR." }, { status: 400 });
        }

        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id }
        });

        if (!bankAccount) {
            return NextResponse.json({ error: "Target Ledger not found." }, { status: 404 });
        }

        // 1. Prepare the File for Gemini Multi-Modal Input
        const buffer = await file.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString("base64");

        const mimeType = file.type || (file.name.endsWith('.csv') ? "text/csv" : "image/jpeg");

        // We use gemini-1.5-pro (the foundation for 3.1 logic/preview) for maximum reasoning & OCR capability
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
You are an elite autonomous Financial AI. Your task is to extract exact transactional records from this document (which is either a Thai Bank Statement CSV or an e-Slip receipt image).
CRITICAL RULES:
1. Output ONLY a valid JSON array of objects. Do NOT include markdown code fences (like \`\`\`json) or any conversational text.
2. If there are no clear transactions, return an empty array [].
3. For each transaction found, format the JSON object EXACTLY like this:
{
  "amount": 1500.00,        // Must be a positive Number
  "date": "2024-03-07T10:00:00Z", // Must be an ISO-8601 string
  "type": "INCOME",         // Must be strictly "INCOME" or "EXPENSE"
  "description": "Transfer from Tara / KBank" // Provide a concise summary of the sender, receiver, or memo.
}
`;

        // 2. Transmit to Google Gemini Auto-Match Engine
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]);

        const rawResponseText = result.response.text();

        // Safety Catch: Clean markdown fences if Gemini disobeys rule 1
        const cleanedMetadata = rawResponseText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

        let aiExtractedItems = [];
        try {
            aiExtractedItems = JSON.parse(cleanedMetadata);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", rawResponseText);
            throw new Error("Gemini returned an invalid JSON schema.");
        }

        // 3. Database Look-Ahead Auto-Matching
        // Fetch all unreconciled orders in the Company Brand to magically find matches
        const pendingOrders = await prisma.order.findMany({
            where: {
                isReconciled: false,
                status: { not: 'CANCELLED' },
                companyBrandId: bankAccount.companyBrandId
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const finalStagedItems = [];
        let index = 1;

        for (const item of aiExtractedItems) {
            // Predict if this is an INCOME matched to an Order
            let matchedOrderId = null;
            let confidence = file.name.endsWith('.csv') ? 70 : 85;

            if (item.type === 'INCOME') {
                // Look for an order with the EXACT same total amount
                const perfectMatch = pendingOrders.find(o => Math.abs(o.total - item.amount) < 0.01);
                if (perfectMatch) {
                    matchedOrderId = perfectMatch.id;
                    confidence = 99; // Perfect amount match + AI extraction = 99% confident
                    item.description = `Auto-Match: Order #${perfectMatch.id.slice(-6).toUpperCase()} (${item.description})`;
                }
            }

            finalStagedItems.push({
                id: `gemini_${Date.now()}_${index++}`,
                date: item.date,
                amount: item.amount,
                type: item.type,
                description: item.description,
                confidence,
                matchedOrderId
            });
        }

        return NextResponse.json({ items: finalStagedItems });

    } catch (e: any) {
        console.error("Gemini Vision Extraction Error:", e);
        return NextResponse.json({ error: "Gemini Vision Engine Failed: " + e.message }, { status: 500 });
    }
}
