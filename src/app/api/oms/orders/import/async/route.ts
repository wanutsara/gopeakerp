import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

// Detached Background Worker Function
// In a serverless environment (Vercel), this may timeout if it takes > 60s, 
// but for local deployments or Node.js servers, it perfectly supports long-running async threads.
async function processJobAsync(jobId: string, rawData: string, userId: string) {
    try {
        if (!genAI) throw new Error("GEMINI_API_KEY Missing");

        // 1. Update status to PROCESSING
        await prisma.importJob.update({
            where: { id: jobId },
            data: { status: 'PROCESSING' }
        });

        // 2. Call Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const prompt = `
You are an advanced E-commerce Data Parser AI.
You will receive raw text from a CSV/Excel export containing sales data from platforms like Shopee, Lazada, TikTok, Line, or Page365.
Extract all valid sales orders from this raw data and convert them into a structured JSON array exactly matching the database schema below.

Rules:
1. ONLY return a valid JSON array. Do not wrap it in markdown codeblocks (no \`\`\`json). Just the raw JSON format.
2. Group the data by Order/Row. Estimate data if not purely explicit.
3. If SKUs are found, extract the SKU, Quantity, and ProductName. If no SKUs are listed, leave the items array empty.
4. Sales Channel must be mapped to one of: 'SHOPEE', 'LAZADA', 'TIKTOK', 'LINESHOPPING', 'FACEBOOK', 'IG', 'POS', 'OTHER'.
5. Extract the Customer's Identity (Name, Profile Name, Phone number). Fill customerName, profileName, and customerPhone.
6. Extract and split the Customer's Shipping Address into granular Geographic components: province, district, subdistrict, postalCode.

Output Schema:
Array of Objects:
[
  {
    "channel": "String",
    "date": "ISO Date String (e.g. 2024-03-01T00:00:00Z)",
    "customerName": "String",
    "profileName": "String",
    "customerPhone": "String",
    "province": "String",
    "district": "String",
    "subdistrict": "String",
    "postalCode": "String",
    "address": "String",
    "subtotal": Number,
    "shippingFee": Number,
    "platformFee": Number,
    "discount": Number,
    "total": Number,
    "items": [
      {
        "sku": "String",
        "productName": "String",
        "qty": Number,
        "price": Number
      }
    ]
  }
]

Raw Data to Parse:
${rawData.substring(0, 100000)}
`;

        const result = await model.generateContent(prompt);
        let jsonText = result.response.text().trim();

        if (jsonText.startsWith('\`\`\`json')) {
            jsonText = jsonText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
        } else if (jsonText.startsWith('\`\`\`')) {
            jsonText = jsonText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
        }

        const parsedData = JSON.parse(jsonText);

        // 3. Mark Job as Completed
        await prisma.importJob.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                resultJson: parsedData
            }
        });

        // 4. Send Notification to User
        await prisma.notification.create({
            data: {
                userId: userId,
                title: '✅ AI Extraction Completed',
                message: `Your data import job has been successfully processed by Gemini and is ready for Review.`,
                type: 'SYSTEM',
                referenceId: jobId
            }
        });

    } catch (error: any) {
        console.error("Background AI Worker Error:", error);
        // Mark Job as Failed
        await prisma.importJob.update({
            where: { id: jobId },
            data: {
                status: 'FAILED',
                errorLog: error.message || 'Unknown Error'
            }
        });

        // Send Error Notification
        await prisma.notification.create({
            data: {
                userId: userId,
                title: '❌ AI Extraction Failed',
                message: `Your recent data import encountered an error: ${error.message || 'Unknown'}`,
                type: 'SYSTEM',
                referenceId: jobId
            }
        });
    }
}


export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body;

        // --- ACTION: UPLOAD (Start Background Job) ---
        if (action === 'UPLOAD') {
            const { rawData, fileName, fileSize } = body;

            if (!rawData) {
                return NextResponse.json({ error: 'Missing rawData' }, { status: 400 });
            }

            // Create Pending Job Record
            const job = await prisma.importJob.create({
                data: {
                    userId: session.user.id,
                    fileName: fileName || 'Unknown File',
                    fileSize: fileSize || 0,
                    status: 'PENDING'
                }
            });

            // Fire and Forget (Decoupled execution in the Node.js event loop)
            processJobAsync(job.id, rawData, session.user.id);

            // Immediately Return Queue Ticket ID
            return NextResponse.json({ success: true, jobId: job.id });
        }

        // --- ACTION: STATUS (Poll Job Status) ---
        if (action === 'STATUS') {
            const { jobId } = body;
            if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

            const job = await prisma.importJob.findUnique({
                where: { id: jobId }
            });

            if (!job || job.userId !== session.user.id) {
                return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 404 });
            }

            return NextResponse.json({ success: true, job });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Async Omni-AI Endpoint Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
