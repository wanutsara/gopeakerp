import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { normalizePhone, normalizeName, jaroWinkler } from '@/lib/cdp/matcher';

const apiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!genAI) {
            return NextResponse.json({
                error: 'GEMINI_API_KEY is not configured in .env. Please add it to unlock Omni-AI Importer.'
            }, { status: 500 });
        }

        const body = await request.json();
        const { rawData, action } = body;

        // --- STEP 1: The AI Extractor (Upgraded with CDP Customer Extraction) ---
        if (action === 'ANALYZE') {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

            const prompt = `
You are an advanced E-commerce Data Parser AI.
You will receive raw text from a CSV/Excel export containing sales data from platforms like Shopee, Lazada, TikTok, Line, or Page365.
Extract all valid sales orders from this raw data and convert them into a structured JSON array exactly matching the database schema below. 

Rules:
1. ONLY return a valid JSON array. Do not wrap it in markdown codeblocks (no \`\`\`json). Just the raw JSON format.
2. Group the data by Order/Row. Estimate data if not purely explicit (e.g. if platform fee isn't explicit but sales and net are, calculate it).
3. If SKUs are found, extract the SKU and the Quantity. If no SKUs are listed, leave the items array empty.
4. Sales Channel must be mapped to one of: 'SHOPEE', 'LAZADA', 'TIKTOK', 'LINESHOPPING', 'FACEBOOK', 'IG', 'POS', 'OTHER'. Make an educated guess based on keywords.
5. BIG RULE: Extract the Customer's Identity (Name, Phone number). If present, fill customerName and customerPhone. If absent, use "Unknown Customer" or null. This is critical for building a Customer Data Platform (CDP).

Output Schema:
Array of Objects:
[
  {
    "orderId": "String (Extract the exact Order ID or Receipt number if present. If absent, return null)",
    "channel": "String",
    "date": "ISO Date String (e.g. 2024-03-01T00:00:00Z)",
    "customerName": "String",
    "customerPhone": "String",
    "address": "String (Full physical address, excluding province/district/postal code)",
    "province": "String",
    "district": "String",
    "postalCode": "String",
    "subtotal": Number,
    "shippingFee": Number,
    "platformFee": Number,
    "discount": Number,
    "total": Number,
    "items": [
      {
        "sku": "String",
        "qty": Number,
        "price": Number
      }
    ]
  }
]

Raw Data to Parse:
${(rawData as string).substring(0, 100000)}
            `;

            console.log("Analyzing CSV via Gemini 1.5 Pro (CDP Model)...");
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Clean markdown block
            let jsonText = responseText.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();
            }

            try {
                // Safely parsing
                const orders = JSON.parse(jsonText);
                return NextResponse.json({ success: true, analysis: orders });
            } catch (err) {
                console.error("Gemini output was not pure JSON", jsonText);
                return NextResponse.json({ error: 'LLM Response Error: Not valid JSON format.' }, { status: 500 });
            }
        }

        // --- STEP 2: The Database Sync (CDP + Auto-COGS) ---
        if (action === 'SYNC') {
            const { orders, companyBrandId } = body;
            const results = { synced: 0, stockUpdated: 0, customersCreated: 0, errors: [] as string[] };

            // Phase 29: System-wide Accounting Guard
            const globalSettings = await prisma.companySetting.findFirst();
            const cutoffDate = globalSettings?.financeGoLiveDate || null;

            for (const order of orders) {
                try {
                    let customerId = null;

                    // CDP: Dynamic Customer Resolution
                    if (order.customerName && order.customerName !== 'Unknown Customer') {
                        let existingCustomer = null;

                        // 1. DETERMINISTIC MATCH (Phone Number)
                        if (order.customerPhone) {
                            const normPhone = normalizePhone(order.customerPhone);
                            // Query Primary Customer Table
                            existingCustomer = await prisma.customer.findFirst({
                                where: {
                                    OR: [
                                        { phone: normPhone },
                                        { phone: order.customerPhone }
                                    ]
                                }
                            });

                            // Query Alternate Aliases if not found
                            if (!existingCustomer) {
                                const matchedAlias = await prisma.customerAlias.findFirst({
                                    where: {
                                        OR: [
                                            { phone: normPhone },
                                            { phone: order.customerPhone }
                                        ]
                                    },
                                    include: { customer: true }
                                });
                                if (matchedAlias) existingCustomer = matchedAlias.customer;
                            }
                        }

                        // 2. PROBABILISTIC / FUZZY MATCH (Jaro-Winkler over Names)
                        // Triggered only if Phone Matching failed or was absent
                        let highestScore = 0;
                        let bestMatchId = null;

                        if (!existingCustomer) {
                            const normIncomingName = normalizeName(order.customerName);
                            // For MVP, pulling all names. In production, we'd use pg_trgm inside raw SQL.
                            const allCustomers = await prisma.customer.findMany({ select: { id: true, name: true } });

                            for (const c of allCustomers) {
                                const score = jaroWinkler(normIncomingName, normalizeName(c.name));
                                if (score > highestScore) {
                                    highestScore = score;
                                    bestMatchId = c.id;
                                }
                            }

                            // AUTO-MERGE THRESHOLD
                            if (highestScore >= 0.90 && bestMatchId) {
                                existingCustomer = await prisma.customer.findUnique({ where: { id: bestMatchId } });

                                // Silently log alias for future deterministic tracking
                                await prisma.customerAlias.create({
                                    data: {
                                        customerId: bestMatchId,
                                        name: order.customerName,
                                        phone: order.customerPhone || null,
                                        profileName: order.profileName || null,
                                        source: order.channel || 'OTHER'
                                    }
                                });
                            }
                        }

                        // 3. EXECUTE RESOLUTION STATE
                        if (existingCustomer) {
                            customerId = existingCustomer.id;

                            const updateData: any = {
                                totalSpent: { increment: Number(order.total) || 0 }
                            };

                            // Retroactively fill missing address data if the LLM found it in this new order
                            if (!existingCustomer.address && order.address) updateData.address = order.address;
                            if (!existingCustomer.province && order.province) updateData.province = order.province;
                            if (!existingCustomer.district && order.district) updateData.district = order.district;
                            if (!existingCustomer.postalCode && order.postalCode) updateData.postalCode = order.postalCode;

                            await prisma.customer.update({
                                where: { id: existingCustomer.id },
                                data: updateData
                            });
                        } else {
                            // CREATE NEW IDENTITY
                            const newCustomer = await prisma.customer.create({
                                data: {
                                    name: order.customerName,
                                    profileName: order.profileName || null,
                                    phone: order.customerPhone || null,
                                    address: order.address || null,
                                    province: order.province || null,
                                    district: order.district || null,
                                    subdistrict: order.subdistrict || null,
                                    postalCode: order.postalCode || null,
                                    source: order.channel || 'OTHER',
                                    totalSpent: Number(order.total) || 0
                                }
                            });
                            customerId = newCustomer.id;
                            results.customersCreated++;

                            // SUGGEST TO MERGE: Create a ResolutionMatch ticket for the Admin
                            if (highestScore >= 0.70 && highestScore < 0.90 && bestMatchId) {
                                await prisma.resolutionMatch.create({
                                    data: {
                                        masterCustomerId: bestMatchId,
                                        duplicateCustomerId: newCustomer.id,
                                        confidenceScore: highestScore,
                                        status: 'PENDING'
                                    }
                                });
                            }
                        }
                    }

                    // 4. IDEMPOTENCY SHIELD (Duplicate Prevention)
                    let isDuplicate = false;

                    if (order.orderId) {
                        // Deterministic Check
                        const existingOrderById = await prisma.order.findFirst({ where: { notes: order.orderId } });
                        if (existingOrderById) isDuplicate = true;
                    }

                    if (!isDuplicate && customerId && order.total) {
                        // Heuristic Probabilistic Check (Same customer, same exact total, same day)
                        const oDate = new Date(order.date || new Date());
                        const startOfDay = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
                        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

                        const existingOrderHeuristic = await prisma.order.findFirst({
                            where: {
                                customerId: customerId,
                                total: Number(order.total),
                                createdAt: {
                                    gte: startOfDay,
                                    lt: endOfDay
                                }
                            }
                        });
                        if (existingOrderHeuristic) isDuplicate = true;
                    }

                    if (isDuplicate) {
                        results.errors.push(`Skipped duplicate order for customer: ${order.customerName} (Total: ฿${order.total})`);
                        continue; // Skip creating the exact same order and transactions again
                    }

                    // Create Order internally, linked to CDP Customer
                    const dbOrder = await prisma.order.create({
                        data: {
                            channel: order.channel || 'OTHER',
                            status: 'COMPLETED',
                            customerId: customerId, // Explicitly link to CRM profile
                            companyBrandId: companyBrandId || null, // Map to Specific Brand Location
                            subtotal: Number(order.subtotal) || 0,
                            shippingFee: Number(order.shippingFee) || 0,
                            platformFee: Number(order.platformFee) || 0,
                            discount: Number(order.discount) || 0,
                            total: Number(order.total) || 0,
                            notes: order.orderId || 'AI Omni-Importer',
                            createdAt: new Date(order.date || new Date()),
                        }
                    });

                    const orderDate = new Date(order.date || new Date());

                    // CASH FLOW CUT-OFF SHIELD
                    // Prevent historical imports from warping the current General Ledger
                    let shouldLogTransaction = true;
                    if (cutoffDate) {
                        const cutOff = new Date(cutoffDate);
                        cutOff.setHours(0, 0, 0, 0);
                        if (orderDate < cutOff) {
                            shouldLogTransaction = false;
                        }
                    }

                    if (shouldLogTransaction) {
                        // General Ledger Translation
                        await prisma.transaction.create({
                            data: {
                                type: 'INCOME',
                                amount: Number(order.total) || 0,
                                amountTHB: Number(order.total) || 0,
                                date: orderDate,
                                category: 'SALES_REVENUE',
                                description: `AI Sync: ${order.channel} Sales (${order.customerName || 'Walk-in'})`
                            }
                        });
                    }

                    results.synced++;

                    // Cut Stock Logic
                    if (order.items && order.items.length > 0) {
                        for (const item of order.items) {
                            if (!item.sku) continue;
                            const qtyNum = item.qty || 1;
                            let product = await prisma.product.findFirst({ where: { sku: item.sku } });

                            const defaultLoc = await prisma.location.findFirst({ where: { isDefault: true } });

                            if (product) {
                                // 1. Decrement Read-Only Aggregate
                                await prisma.product.update({
                                    where: { id: product.id },
                                    data: { stock: { decrement: qtyNum } }
                                });

                                // 2. Decrement Real Multi-Warehouse Level
                                if (defaultLoc) {
                                    const inv = await prisma.inventoryLevel.findUnique({
                                        where: { productId_locationId: { productId: product.id, locationId: defaultLoc.id } }
                                    });
                                    if (inv) {
                                        await prisma.inventoryLevel.update({
                                            where: { id: inv.id },
                                            data: { available: { decrement: qtyNum } }
                                        });
                                    } else {
                                        await prisma.inventoryLevel.create({
                                            data: {
                                                productId: product.id,
                                                locationId: defaultLoc.id,
                                                available: -qtyNum
                                            }
                                        });
                                    }
                                }
                                results.stockUpdated++;
                            } else {
                                // Auto-create Missing SKU with Multi-Warehouse binding
                                product = await prisma.product.create({
                                    data: {
                                        sku: item.sku,
                                        name: item.productName || `Auto-imported: ${item.sku}`,
                                        stock: -qtyNum, // Negative stock because we deduct it immediately
                                        ...(defaultLoc && {
                                            inventoryLevels: {
                                                create: {
                                                    locationId: defaultLoc.id,
                                                    available: -qtyNum
                                                }
                                            }
                                        })
                                    }
                                });
                                results.stockUpdated++;
                                results.errors.push(`Auto-Created New SKU: '${item.sku}'`);
                            }

                            // Always link OrderItem to the existing or newly created product
                            if (dbOrder && product) {
                                await prisma.orderItem.create({
                                    data: {
                                        orderId: dbOrder.id, // Links dynamically to the parent dbOrder resolved outside the loop
                                        productId: product.id,
                                        productName: item.productName || product.name || item.sku,
                                        quantity: qtyNum,
                                        price: item.price || 0,
                                    }
                                });
                            }
                        }
                    }
                } catch (e: any) {
                    results.errors.push(`Order Sync Error: ${e.message}`);
                }
            }

            return NextResponse.json({ success: true, results });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Omni-AI Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
