import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,th;q=0.8,zh-CN;q=0.7,zh;q=0.6',
    'Cache-Control': 'no-cache'
};

interface ExtractedProductData {
    title: string;
    originalTitle?: string;
    sourceUrl: string;
    sourcePlatform: '1688' | 'AMAZON' | 'TAOBAO' | 'ALIBABA' | 'OTHER';
    foreignCurrency: 'RMB' | 'USD' | 'THB';
    foreignPrice: number;
    foreignDomesticShipping?: number;
    imageUrl: string;
    galleryImages: string[];
    category: string;
    supplierName: string;
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    notes: string;
    blockedByAntiBot?: boolean;
    warningMessage?: string;
}

function detectPlatform(url: string): {
    platform: '1688' | 'AMAZON' | 'TAOBAO' | 'ALIBABA' | 'OTHER';
    currency: 'RMB' | 'USD' | 'THB';
} {
    const lower = url.toLowerCase();
    if (lower.includes('1688.com')) return { platform: '1688', currency: 'RMB' };
    if (lower.includes('taobao.com') || lower.includes('tmall.com') || lower.includes('tb.cn')) {
        return { platform: 'TAOBAO', currency: 'RMB' };
    }
    if (lower.includes('amazon.') || lower.includes('a.co/')) {
        return { platform: 'AMAZON', currency: 'USD' };
    }
    if (lower.includes('alibaba.com') || lower.includes('aliexpress.com')) {
        return { platform: 'ALIBABA', currency: 'USD' };
    }
    return { platform: 'OTHER', currency: 'RMB' };
}

function decodeHtmlEntities(str: string): string {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
        .trim();
}

function parseHtmlMetadata(html: string, url: string) {
    let title = '';
    let price = 0;
    let currency = '';
    let supplierName = '';
    const images: string[] = [];
    let description = '';
    let weightKg = 0;
    let lengthCm = 0;
    let widthCm = 0;
    let heightCm = 0;

    // 1. OpenGraph & Meta tags
    const ogTitle =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
    if (ogTitle) title = decodeHtmlEntities(ogTitle);

    if (!title) {
        const productTitleSpan = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
        if (productTitleSpan) title = decodeHtmlEntities(productTitleSpan);
    }

    if (!title) {
        const htmlTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
        if (htmlTitle) title = decodeHtmlEntities(htmlTitle);
    }

    const ogImage =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    if (ogImage && ogImage.startsWith('http')) {
        images.push(decodeHtmlEntities(ogImage));
    }

    // Amazon hiRes images
    const hiResMatches = html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g);
    for (const m of hiResMatches) {
        if (m[1] && !images.includes(m[1])) {
            images.push(m[1]);
        }
    }

    // Amazon dynamic image fallback
    const dynamicImgMatches = html.matchAll(/"(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9._+-]+\._AC_S[LX]\d+_\.jpg)"/g);
    for (const m of dynamicImgMatches) {
        if (m[1] && !images.includes(m[1])) {
            images.push(m[1]);
        }
    }

    // 1688 / Alibaba CDN images
    const aliImgMatches = html.matchAll(/(https?:\/\/cbu01\.alicdn\.com\/img\/ibank\/[^"'\s)]+\.jpg)/gi);
    for (const m of aliImgMatches) {
        if (m[1] && !images.includes(m[1])) {
            images.push(m[1]);
        }
    }

    // Price extraction from meta/DOM
    const metaPrice =
        html.match(/<meta[^>]+property=["'](?:og:price:amount|product:price:amount)["'][^>]+content=["']([0-9.,]+)["']/i)?.[1] ||
        html.match(/"priceAmount"\s*:\s*([0-9.]+)/)?.[1] ||
        html.match(/class=["']a-offscreen["']>\s*[$¥฿€£]?\s*([0-9,.]+)\s*<\//i)?.[1] ||
        html.match(/class=["']a-price-whole["']>([0-9,]+)<[\s\S]{0,120}?class=["']a-price-fraction["']>([0-9]+)</i)?.slice(1, 3).join('.');

    if (metaPrice) {
        const parsed = parseFloat(String(metaPrice).replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) price = parsed;
    }

    // JSON-LD Product Schema
    const ldJsonBlocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const block of ldJsonBlocks) {
        try {
            const raw = JSON.parse(block[1].trim());
            const items = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw];
            for (const item of items) {
                if (item && (item['@type'] === 'Product' || item.offers || item.name)) {
                    if (!title && item.name) title = decodeHtmlEntities(String(item.name));
                    if (item.description && !description) description = decodeHtmlEntities(String(item.description));
                    if (item.brand?.name && !supplierName) supplierName = String(item.brand.name);
                    if (item.image) {
                        const imgList = Array.isArray(item.image) ? item.image : [item.image];
                        for (const img of imgList) {
                            const imgUrl = typeof img === 'string' ? img : img?.url;
                            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http') && !images.includes(imgUrl)) {
                                images.push(imgUrl);
                            }
                        }
                    }
                    const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                    if (offers) {
                        const p = parseFloat(offers.price ?? offers.lowPrice ?? 0);
                        if (!isNaN(p) && p > 0 && !price) price = p;
                        if (offers.priceCurrency && !currency) currency = String(offers.priceCurrency);
                    }
                }
            }
        } catch {
            // Ignore malformed JSON-LD
        }
    }

    // Extract Amazon Brand / Byline
    if (!supplierName) {
        const byline = html.match(/id=["']bylineInfo["'][^>]*>([\s\S]*?)<\/a>/i)?.[1];
        if (byline) {
            supplierName = decodeHtmlEntities(byline.replace(/<[^>]+>/g, ''))
                .replace(/^Visit the\s+/i, '')
                .replace(/\s+Store$/i, '')
                .replace(/^Brand:\s*/i, '')
                .trim();
        }
    }

    return {
        title,
        price,
        currency,
        supplierName,
        images: images.slice(0, 8),
        description,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        url
    };
}

function parseJinaMarkdown(md: string) {
    let title = '';
    let price = 0;
    const images: string[] = [];
    let weightKg = 0;
    let lengthCm = 0;
    let widthCm = 0;
    let heightCm = 0;

    const titleLine = md.match(/^Title:\s*(.+)$/m)?.[1];
    if (titleLine) {
        title = titleLine
            .replace(/^Amazon\.com:\s*/i, '')
            .replace(/\s*:\s*(Electronics|Home & Kitchen|Sports & Outdoors|Toys & Games|Beauty & Personal Care| Clothing, Shoes & Jewelry|Everything Else).*$/i, '')
            .trim();
    }

    // Extract Markdown Images
    const imgMatches = md.matchAll(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g);
    for (const m of imgMatches) {
        const imgUrl = m[1];
        if (
            imgUrl &&
            !imgUrl.includes('sprite') &&
            !imgUrl.includes('fls-na.amazon') &&
            !imgUrl.includes('01GK70BG4uL') &&
            !imgUrl.includes('tps-222-222') &&
            !imgUrl.includes('TB17G2dJGmWBuNjy1XaXXXCbXXa') &&
            !imgUrl.endsWith('.svg') &&
            !imgUrl.includes('_SR38,50_') &&
            !imgUrl.includes('_SY85_')
        ) {
            // Upgrade Amazon thumbnail resolution if needed
            const hiResUrl = imgUrl.replace(/\._AC_SX\d+_\./, '._AC_SL1000_.');
            if (!images.includes(hiResUrl)) {
                images.push(hiResUrl);
            }
        }
    }

    // Weight parsing from Markdown (pounds / ounces / kg / g)
    const weightLbMatch = md.match(/(?:Item Weight|Weight)[^|\n]*?[|:]?\s*‎?([0-9.]+)\s*(?:pounds|lbs)/i);
    const weightOzMatch = md.match(/(?:Item Weight|Weight)[^|\n]*?[|:]?\s*‎?([0-9.]+)\s*(?:ounces|oz)/i);
    const weightKgMatch = md.match(/(?:Item Weight|Weight|重量)[^|\n]*?[|:]?\s*‎?([0-9.]+)\s*(?:kg|kilograms|千克|公斤)/i);
    const weightGramMatch = md.match(/(?:Item Weight|Weight|重量)[^|\n]*?[|:]?\s*‎?([0-9.]+)\s*(?:grams|g|克)\b/i);

    if (weightKgMatch) {
        weightKg = Math.round(parseFloat(weightKgMatch[1]) * 100) / 100;
    } else if (weightLbMatch) {
        weightKg = Math.round(parseFloat(weightLbMatch[1]) * 0.453592 * 100) / 100;
    } else if (weightOzMatch) {
        weightKg = Math.round(parseFloat(weightOzMatch[1]) * 0.0283495 * 100) / 100;
    } else if (weightGramMatch) {
        weightKg = Math.round((parseFloat(weightGramMatch[1]) / 1000) * 100) / 100;
    }

    // Dimensions parsing from Markdown (inches or cm)
    const dimInchMatch = md.match(
        /(?:Product Dimensions|Package Dimensions)[^|\n]*?[|:]?\s*‎?([0-9.]+)\s*x\s*([0-9.]+)\s*x\s*([0-9.]+)\s*inches/i
    );
    const dimCmMatch = md.match(
        /(?:Product Dimensions|Package Dimensions|尺寸)[^|\n]*?[|:]?\s*‎?([0-9.]+)\s*x\s*([0-9.]+)\s*x\s*([0-9.]+)\s*cm/i
    );

    if (dimCmMatch) {
        lengthCm = Math.round(parseFloat(dimCmMatch[1]) * 10) / 10;
        widthCm = Math.round(parseFloat(dimCmMatch[2]) * 10) / 10;
        heightCm = Math.round(parseFloat(dimCmMatch[3]) * 10) / 10;
    } else if (dimInchMatch) {
        lengthCm = Math.round(parseFloat(dimInchMatch[1]) * 2.54 * 10) / 10;
        widthCm = Math.round(parseFloat(dimInchMatch[2]) * 2.54 * 10) / 10;
        heightCm = Math.round(parseFloat(dimInchMatch[3]) * 2.54 * 10) / 10;
    }

    // Price in markdown
    const priceMatch =
        md.match(/(?:Price|售价|价格)\s*[:：]?\s*[$¥฿]?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
        md.match(/(?:¥|￥|\$)\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    if (priceMatch) {
        const p = parseFloat(priceMatch[1]);
        if (!isNaN(p) && p > 0) price = p;
    }

    const isCaptcha =
        /Captcha Interception|unusual traffic|RGV587_ERROR|login\.1688\.com|sec\.1688\.com|punish/i.test(md);

    return {
        title,
        price,
        images: images.slice(0, 8),
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        isCaptcha
    };
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const rawInput: string = (body.url || '').trim();
        const rawTextSnippet: string = (body.rawText || '').trim();
        const imageBase64: string = body.imageBase64 || '';
        const imageMimeType: string = body.imageMimeType || 'image/png';

        if (!rawInput && !rawTextSnippet && !imageBase64) {
            return NextResponse.json(
                { error: 'กรุณาระบุลิงก์สินค้า ข้อความ หรือรูปแคปหน้าจอสินค้า' },
                { status: 400 }
            );
        }

        // Extract clean URL if user pasted a 1688/Taobao share snippet containing both text and URL
        const urlMatch = rawInput.match(/https?:\/\/[^\s"'<>]+/i);
        const cleanUrl = urlMatch ? urlMatch[0] : rawInput.startsWith('http') ? rawInput : '';
        const extraShareText = urlMatch ? rawInput.replace(urlMatch[0], '').trim() : '';
        const combinedUserText = [extraShareText, rawTextSnippet].filter(Boolean).join('\n');

        const { platform, currency } = detectPlatform(cleanUrl || rawInput);

        let htmlData = {
            title: '',
            price: 0,
            currency: '',
            supplierName: '',
            images: [] as string[],
            description: '',
            weightKg: 0,
            lengthCm: 0,
            widthCm: 0,
            heightCm: 0
        };

        let jinaData = {
            title: '',
            price: 0,
            images: [] as string[],
            weightKg: 0,
            lengthCm: 0,
            widthCm: 0,
            heightCm: 0,
            isCaptcha: false
        };

        let jinaRawMarkdown = '';
        let blockedByAntiBot = false;

        // Layer 1 & Layer 2: Run Direct Fetch + Jina Reader in parallel when a URL is provided
        if (cleanUrl) {
            const [directRes, jinaRes] = await Promise.allSettled([
                fetch(cleanUrl, {
                    headers: BROWSER_HEADERS,
                    redirect: 'follow',
                    signal: AbortSignal.timeout(6500)
                }).then((r) => r.text()),
                fetch(`https://r.jina.ai/${cleanUrl}`, {
                    headers: {
                        'Accept': 'text/plain',
                        'X-Return-Format': 'markdown'
                    },
                    signal: AbortSignal.timeout(8000)
                }).then((r) => r.text())
            ]);

            if (directRes.status === 'fulfilled' && directRes.value) {
                const rawHtml = directRes.value;
                if (/RGV587_ERROR|_____tmd_____|Captcha Interception|sec\.1688\.com/i.test(rawHtml)) {
                    blockedByAntiBot = true;
                } else {
                    htmlData = parseHtmlMetadata(rawHtml, cleanUrl);
                }
            }

            if (jinaRes.status === 'fulfilled' && jinaRes.value) {
                jinaRawMarkdown = jinaRes.value;
                jinaData = parseJinaMarkdown(jinaRawMarkdown);
                if (jinaData.isCaptcha) {
                    blockedByAntiBot = true;
                }
            }
        }

        // Merge Layer 1 & Layer 2 results
        const mergedImages = Array.from(new Set([...htmlData.images, ...jinaData.images])).filter(Boolean);
        let bestTitle = htmlData.title || jinaData.title || '';
        let bestPrice = htmlData.price || jinaData.price || 0;
        let bestWeightKg = htmlData.weightKg || jinaData.weightKg || 0;
        let bestLengthCm = htmlData.lengthCm || jinaData.lengthCm || 0;
        let bestWidthCm = htmlData.widthCm || jinaData.widthCm || 0;
        let bestHeightCm = htmlData.heightCm || jinaData.heightCm || 0;
        let bestSupplier = htmlData.supplierName || '';
        let bestCategory = '';
        let bestNotes = '';
        let originalTitle = bestTitle;

        // Also check if extraShareText or combinedUserText has a price (e.g. "¥25.5" or "25.5元")
        if (!bestPrice && combinedUserText) {
            const snippetPrice =
                combinedUserText.match(/(?:¥|￥|\$)\s*([0-9]+(?:\.[0-9]{1,2})?)/)?.[1] ||
                combinedUserText.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元|หยวน|USD|บาท)/)?.[1];
            if (snippetPrice) {
                bestPrice = parseFloat(snippetPrice);
            }
        }

        if (!bestTitle && extraShareText) {
            const bracketTitle = extraShareText.match(/【([^】]+)】/)?.[1];
            bestTitle = bracketTitle || extraShareText.slice(0, 120);
            originalTitle = bestTitle;
        }

        // Layer 3: Gemini 2.5 Flash Enrichment (Translates title to Thai, extracts price/specs from Markdown, Text, or Screenshot!)
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const useSearchGrounding = Boolean(cleanUrl && !imageBase64 && (!bestTitle || !bestPrice));
                const model = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    ...(useSearchGrounding ? { tools: [{ googleSearch: {} } as any] } : {})
                });

                const contextExcerpt = jinaRawMarkdown
                    ? jinaRawMarkdown.slice(0, 6000)
                    : htmlData.description.slice(0, 2000);

                const prompt = `คุณคือระบบ AI อัจฉริยะช่วยดึงข้อมูลสินค้าพรีออเดอร์ (1688, Taobao, Amazon, Alibaba) สำหรับระบบ GOPEAK ERP
กรุณาดึงข้อมูลสินค้าจากข้อมูลที่ให้ด้านล่างนี้ (หรือจากรูปแคปหน้าจอสินค้าที่แนบมา) และตอบกลับเป็น JSON เท่านั้น:

ข้อมูลเบื้องต้นที่ระบบสกัดได้:
- URL: ${cleanUrl || 'ไม่ได้ระบุ'}
- แพลตฟอร์ม: ${platform}
- ชื่อสินค้าต้นทางที่พบ: ${bestTitle || 'ยังไม่พบ'}
- ราคาต้นทางที่พบ: ${bestPrice || 'ยังไม่พบ'} (${currency})
- ร้านค้า/แบรนด์: ${bestSupplier || 'ยังไม่พบ'}
- น้ำหนักที่พบ (kg): ${bestWeightKg || 'ยังไม่พบ'}
- ขนาดกล่องที่พบ (cm): ${bestLengthCm} x ${bestWidthCm} x ${bestHeightCm}
- ข้อความที่ผู้ใช้คัดลอกมา: ${combinedUserText || 'ไม่มี'}
- เนื้อหาหน้าเว็บ (ย่อ):
${contextExcerpt || 'ไม่มีเนื้อหาหน้าเว็บ (อาจติด Captcha หรือใช้รูปภาพแทน)'}

คำสั่ง:
1. "thaiTitle": ตั้งชื่อสินค้าเป็น "ภาษาไทย" ที่กระชับ ชัดเจน เหมาะสำหรับใช้เป็นชื่อสินค้าพรีออเดอร์ใน ERP (ถ้ามีชื่อรุ่น/แบรนด์ให้ใส่ไว้ด้วย)
2. "originalTitle": ชื่อสินค้าภาษาต้นฉบับ (จีน/อังกฤษ)
3. "foreignPrice": ราคาสินค้าต่อ 1 ชิ้นตามสกุลเงินต้นทาง (ตัวเลขทศนิยม เช่น 28.5 หรือ 199.99) หากมีหลายเรทราคาตามจำนวน (Tiered pricing บน 1688) ให้ใช้ราคาเริ่มต้นหรือราคาขายส่งขั้นแรก
4. "foreignCurrency": สกุลเงิน ("RMB" สำหรับจีน ¥/หยวน, "USD" สำหรับดอลลาร์ $, "THB" สำหรับบาท)
5. "category": หมวดหมู่สินค้าภาษาไทย เช่น "ของใช้ในบ้าน", "อุปกรณ์ไอที", "แกดเจ็ต", "แฟชั่น/กระเป๋า", "ของเล่น/แม่และเด็ก"
6. "supplierName": ชื่อร้านค้า โรงงาน หรือแบรนด์ผู้ผลิต (ถ้าทราบ)
7. "weightKg": น้ำหนักสินค้าต่อชิ้น (หน่วยกิโลกรัม เช่น 0.35) — หากหน้าเว็บไม่ได้ระบุตรงๆ ให้ช่วยประเมินน้ำหนักจริงตามขนาดและประเภทสินค้า
8. "lengthCm", "widthCm", "heightCm": ขนาดกล่องสินค้าโดยประมาณ หน่วยเซนติเมตร (ซม.)
9. "notes": สรุปสเปกสำคัญ, จำนวนสั่งขั้นต่ำ (MOQ), สี/ตัวเลือก หรือข้อมูลสำคัญจากหน้าสินค้าเป็นภาษาไทยสั้นๆ

ตอบเป็น JSON เท่านั้นตามโครงสร้างนี้ (ห้ามมีข้อความอื่นนอก JSON):
{
  "thaiTitle": "string",
  "originalTitle": "string",
  "foreignPrice": number,
  "foreignCurrency": "RMB" | "USD" | "THB",
  "category": "string",
  "supplierName": "string",
  "weightKg": number,
  "lengthCm": number,
  "widthCm": number,
  "heightCm": number,
  "notes": "string"
}`;

                const parts: any[] = [{ text: prompt }];
                if (imageBase64) {
                    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
                    parts.push({
                        inlineData: {
                            data: cleanBase64,
                            mimeType: imageMimeType
                        }
                    });
                }

                const aiRes = await model.generateContent(parts);
                const aiText = aiRes.response.text();
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.thaiTitle && !/captcha|unusual traffic/i.test(parsed.thaiTitle)) {
                        bestTitle = parsed.thaiTitle;
                    }
                    if (parsed.originalTitle && !/captcha|unusual traffic/i.test(parsed.originalTitle)) {
                        originalTitle = parsed.originalTitle;
                    }
                    if (Number(parsed.foreignPrice) > 0 && (!bestPrice || imageBase64 || combinedUserText)) {
                        bestPrice = Number(parsed.foreignPrice);
                    } else if (!bestPrice && Number(parsed.foreignPrice) > 0) {
                        bestPrice = Number(parsed.foreignPrice);
                    }
                    if (parsed.category) bestCategory = parsed.category;
                    if (parsed.supplierName && !bestSupplier) bestSupplier = parsed.supplierName;
                    if (!bestWeightKg && Number(parsed.weightKg) > 0) bestWeightKg = Number(parsed.weightKg);
                    if (!bestLengthCm && Number(parsed.lengthCm) > 0) bestLengthCm = Number(parsed.lengthCm);
                    if (!bestWidthCm && Number(parsed.widthCm) > 0) bestWidthCm = Number(parsed.widthCm);
                    if (!bestHeightCm && Number(parsed.heightCm) > 0) bestHeightCm = Number(parsed.heightCm);
                    if (parsed.notes) bestNotes = parsed.notes;
                }
            } catch (aiErr) {
                console.warn('AI enrichment fallback error:', aiErr);
            }
        }

        // Clean up Captcha titles if still blocked and no screenshot/text was provided
        if (/Captcha Interception|unusual traffic|Login/i.test(bestTitle)) {
            bestTitle = '';
            blockedByAntiBot = true;
        }

        const warningMessage =
            blockedByAntiBot && !bestTitle && !imageBase64 && !combinedUserText
                ? 'เว็บ 1688/Taobao บล็อกการดึงข้อมูลอัตโนมัติด้วยระบบป้องกันบอท (Captcha) — คุณสามารถกด Ctrl+V วางภาพแคปหน้าจอสินค้า หรือคัดลอกข้อความจากหน้าเว็บ 1688 มาวางเพื่อให้ AI ดึงชื่อสินค้าและราคาหยวนให้อัตโนมัติได้ทันที!'
                : undefined;

        const result: ExtractedProductData = {
            title: bestTitle,
            originalTitle: originalTitle || undefined,
            sourceUrl: cleanUrl || rawInput,
            sourcePlatform: platform,
            foreignCurrency: currency,
            foreignPrice: bestPrice || 0,
            imageUrl: mergedImages[0] || '',
            galleryImages: mergedImages,
            category: bestCategory,
            supplierName: bestSupplier,
            weightKg: bestWeightKg || 0.4,
            lengthCm: bestLengthCm || 20,
            widthCm: bestWidthCm || 15,
            heightCm: bestHeightCm || 10,
            notes: [
                originalTitle && originalTitle !== bestTitle ? `ชื่อต้นทาง: ${originalTitle}` : '',
                bestNotes
            ]
                .filter(Boolean)
                .join('\n'),
            blockedByAntiBot: Boolean(blockedByAntiBot && !bestTitle),
            warningMessage
        };

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error extracting product URL:', error);
        return NextResponse.json(
            { error: error?.message || 'ไม่สามารถดึงข้อมูลจากลิงก์ได้' },
            { status: 500 }
        );
    }
}
