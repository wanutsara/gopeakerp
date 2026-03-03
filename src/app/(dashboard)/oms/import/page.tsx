"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// Helper to map platform raw columns to our standard format
const parsePlatformData = (channel: string, rawData: any[]) => {
    return rawData.map(row => {
        let orderDate = new Date();
        let platformOrderId = "";
        let status = "PENDING";
        let subtotal = 0;
        let shippingFee = 0;
        let platformFee = 0;
        let discount = 0;
        let total = 0;
        let customerName = "";
        let platformSku = "";
        let productName = "";
        let quantity = 1;
        let price = 0;

        // Note: Real implementations require meticulous column name matching based on actual platform exports.
        // For demonstration, we will map common aliases.
        if (channel === "SHOPEE") {
            platformOrderId = row["หมายเลขคำสั่งซื้อ"] || row["Order ID"] || "";
            status = row["สถานะคำสั่งซื้อ"] || row["Order Status"] || "";
            total = parseFloat(row["ยอดสุทธิ"] || row["Total Amount"]) || 0;
            platformSku = row["เลขอ้างอิง SKU (SKU Reference No.)"] || row["SKU Ref"] || "";
            productName = row["ชื่อสินค้า"] || row["Product Name"] || "";
            quantity = parseInt(row["จำนวน"] || row["Quantity"]) || 1;
            price = parseFloat(row["ราคาขายส่ง/หน่วย"] || row["Price"]) || 0;
        } else if (channel === "TIKTOK") {
            platformOrderId = row["Order ID"] || row["Order id"] || "";
            status = row["Order Status"] || row["Status"] || "";
            total = parseFloat(row["Order Amount"] || row["Total"]) || 0;
            platformSku = row["Seller SKU"] || row["SKU ID"] || "";
            productName = row["Product Name"] || "";
            quantity = parseInt(row["Quantity"]) || 1;
            price = parseFloat(row["Item Price"]) || 0;
        } else {
            // Generic fallback
            platformOrderId = row["Order ID"] || row["Order ID"] || row["Transaction ID"] || "";
            status = row["Status"] || "";
            total = parseFloat(row["Total"]) || 0;
            platformSku = row["SKU"] || "";
            productName = row["Product"] || "";
            quantity = parseInt(row["Qty"] || row["Quantity"]) || 1;
            price = parseFloat(row["Price"]) || 0;
        }

        return {
            platformOrderId: String(platformOrderId).trim(),
            createdAt: orderDate,
            status,
            subtotal,
            shippingFee,
            platformFee,
            discount,
            total,
            customerName,
            items: [
                {
                    platformSku: String(platformSku).trim(),
                    productName: String(productName).trim(),
                    quantity,
                    price
                }
            ]
        };
    }).filter(o => o.platformOrderId); // Filter out empty rows
};

// Next, group items by Order ID since some platforms export 1 row per item
const groupOrders = (parsedData: any[]) => {
    const orderMap: Record<string, any> = {};
    parsedData.forEach(row => {
        if (!orderMap[row.platformOrderId]) {
            orderMap[row.platformOrderId] = { ...row, items: [] };
        }
        orderMap[row.platformOrderId].items.push(...row.items);
    });
    return Object.values(orderMap);
};

export default function OrderImportPage() {
    const [channel, setChannel] = useState("SHOPEE");
    const [file, setFile] = useState<File | null>(null);
    const [parsedOrders, setParsedOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null); // Clear previous results
        }
    };

    const handleParse = () => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            const standardized = parsePlatformData(channel, rawJson);
            const grouped = groupOrders(standardized);

            setParsedOrders(grouped);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImport = async () => {
        if (parsedOrders.length === 0) return;
        setLoading(true);
        try {
            const res = await fetch("/api/oms/orders/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channel,
                    orders: parsedOrders
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data.result);
            setFile(null);
            setParsedOrders([]);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">นำเข้าออร์เดอร์ (Import Orders)</h1>
                <p className="mt-1 text-sm text-gray-500">
                    อัปโหลดไฟล์ Excel / CSV ที่ดาวน์โหลดจากระบบหลังบ้านของ แพลตฟอร์มต่างๆ เพื่อดึงเข้ามารวมในระบบ ERP (กันซ้ำ 100%)
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">เลือกช่องทางการขาย</label>
                        <select
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                        >
                            <option value="SHOPEE">Shopee</option>
                            <option value="LAZADA">Lazada</option>
                            <option value="TIKTOK">TikTok Shop</option>
                            <option value="LINESHOPPING">LINE SHOPPING</option>
                            <option value="FACEBOOK">Facebook / IG</option>
                            <option value="POS">POS หน้าร้าน</option>
                            <option value="OTHER">อื่นๆ</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">อัปโหลดไฟล์ (.xlsx หรือ .csv)</label>
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleParse}
                        disabled={!file}
                        className="flex-1 px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                        1. อ่านข้อมูลไฟล์ (Preview)
                    </button>
                    {parsedOrders.length > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition flex justify-center items-center"
                        >
                            {loading ? "กำลังอิมพอร์ต..." : `2. บันทึกเข้าฐานข้อมูล (${parsedOrders.length} ออร์เดอร์)`}
                            {!loading && <ArrowUpTrayIcon className="w-5 h-5 ml-2" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Results Alert */}
            {result && (
                <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">อิมพอร์ตสำเร็จร้อยเปอร์เซ็นต์!</h3>
                    <p className="text-gray-600 mb-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                        <span>✅ <strong className="text-gray-900 ml-1">เพิ่มออร์เดอร์ใหม่:</strong> {result.addedCount} รายการ</span>
                        <span>⚠️ <strong className="text-gray-900 ml-1">ข้อมูลซ้ำ (ข้ามให้แล้ว):</strong> {result.skippedCount} รายการ</span>
                        <span className="text-red-600">❌ <strong className="text-red-700 ml-1">ข้อผิดพลาด:</strong> {result.errorCount} รายการ</span>
                    </p>
                    <div className="text-sm bg-white px-4 py-2 rounded-full font-medium text-gray-500 shadow-sm border border-green-100">
                        รวมประมวลผลทั้งสิ้น {result.totalProcessed} แถว
                    </div>
                </div>
            )}

            {/* Preview Table */}
            {parsedOrders.length > 0 && !result && (
                <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 mb-0 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">พรีวิวข้อมูลเตรียมอิมพอร์ต</h3>
                        <span className="text-xs text-gray-500">แสดงผลจากไฟล์ที่อัปโหลด</span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white sticky top-0 z-10 text-gray-600 font-medium after:absolute after:inset-x-0 after:bottom-0 after:border-b after:border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">รหัสออร์เดอร์ (Platform)</th>
                                    <th className="px-6 py-3">สินค้าที่ซื้อ (SKUs)</th>
                                    <th className="px-6 py-3 text-right">ยอดรวม</th>
                                    <th className="px-6 py-3 text-center">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parsedOrders.slice(0, 50).map((order: any, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-3 font-mono text-xs text-gray-900">{order.platformOrderId}</td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {order.items.map((i: any, j: number) => (
                                                <div key={j} className="text-xs"><span className="font-bold">{i.quantity}x</span> {i.platformSku}</div>
                                            ))}
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-900 font-medium">{order.total}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{order.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {parsedOrders.length > 50 && (
                        <div className="text-center py-4 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
                            (และอีก {parsedOrders.length - 50} รายการ... ประหยัดพื้นที่การแสดงผล)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
