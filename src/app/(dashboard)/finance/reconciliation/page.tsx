"use client";

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ReconciliationDashboard() {
    const { data, mutate, error } = useSWR('/api/finance/reconciliation', fetcher);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);

    const currencyFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFile = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

                // Intelligently map columns regardless of specific platform
                // Shopee / TikTok / Lazada have varying headers
                const mappedData = jsonData.map(row => {
                    const keys = Object.keys(row);
                    // Extremely aggressive Fuzzy Matching for 'Order ID'
                    const orderIdKey = keys.find(k => k.toLowerCase().includes('order') || k.toLowerCase().includes('หมายเลข') || k.toLowerCase().includes('sn'));
                    // Aggressive Matching for 'Payout Amount'
                    const amountKey = keys.find(k => k.toLowerCase().includes('payout') || k.toLowerCase().includes('ยอด') || k.toLowerCase().includes('จำนวนเงิน'));

                    return {
                        platformOrderId: orderIdKey ? String(row[orderIdKey]).trim() : null,
                        payoutAmount: amountKey ? Number(String(row[amountKey]).replace(/,/g, '')) : 0
                    };
                }).filter(r => r.platformOrderId && r.payoutAmount > 0);

                if (mappedData.length === 0) {
                    toast.error("ไม่พบคอลัมน์ Order ID หรือ ยอดเงิน ในไฟล์นี้");
                    setIsProcessing(false);
                    return;
                }

                setParsedPreview(mappedData);
                toast.success(`ค้นพบข้อมูล ${mappedData.length} ออเดอร์ พร้อมตรวจสอบกับระบบ..`);
            } catch (err) {
                console.error("Parse Error:", err);
                toast.error("อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบรูปแบบไฟล์ Excel/CSV");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const executeReconciliation = async () => {
        if (!parsedPreview) return;
        setIsProcessing(true);
        const loadingToast = toast.loading("กำลังผูกระบบ Transaction และคำนวณ Platform Fees...");

        try {
            const res = await fetch('/api/finance/reconciliation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: "E-Commerce",
                    data: parsedPreview
                })
            });
            const result = await res.json();

            if (res.ok) {
                toast.success(result.message || "Reconciliation สำเร็จ!", { id: loadingToast });
                setParsedPreview(null);
                mutate(); // Refresh the pending list
            } else {
                toast.error(result.message || "เกิดข้อผิดพลาดในการกระทบยอด", { id: loadingToast });
            }
        } catch (err) {
            toast.error("Network Error", { id: loadingToast });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        Awaiting Settlement
                    </div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-emerald-600 tracking-tight">E-Commerce Reconciliation</h1>
                    <p className="mt-1 text-sm font-medium text-gray-500">Intelligent Payment Settlement for Shopee, Lazada & TikTok (GAAP Standard)</p>
                </div>

                {data && (
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 flex gap-6 shadow-inner">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Unreconciled Orders</span>
                            <span className="text-2xl font-black text-indigo-700">{data.summary.count}</span>
                        </div>
                        <div className="w-px bg-indigo-200"></div>
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Pending Gross Value</span>
                            <span className="text-2xl font-black text-blue-700">{currencyFormatter.format(data.summary.totalAmount)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Upload Zone & Preview */}
                <div className="lg:col-span-2 space-y-6">

                    {!parsedPreview ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`flex flex-col items-center justify-center h-80 rounded-3xl border-2 border-dashed transition-all duration-300 relative overflow-hidden bg-white
                                ${isDragging ? 'border-emerald-500 bg-emerald-50 scale-[1.02] shadow-xl' : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50 shadow-sm'}
                            `}
                        >
                            <input
                                type="file"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                            />

                            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Drag & Drop Settlement File</h3>
                            <p className="text-sm font-medium text-gray-500 mt-2text-center px-8">Upload Shopee or TikTok payout files (.xlsx, .csv). <br />The AI will aggressively parse and map the data.</p>

                            {isProcessing && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur flex items-center justify-center flex-col z-10">
                                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="mt-4 font-bold text-emerald-700">Reading Excel Matrix...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-emerald-700">Excel Data Parsed ({parsedPreview.length} Rows)</h3>
                                    <p className="text-xs text-gray-500">Review the mapped columns before executing ACID Database sync.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setParsedPreview(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={executeReconciliation}
                                        disabled={isProcessing}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
                                    >
                                        Execute Reconciliation (O2C)
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 sticky top-0 z-10 text-gray-500 text-xs uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Platform Order ID</th>
                                            <th className="px-4 py-3 text-right">Extracted Payout Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-800">
                                        {parsedPreview.slice(0, 50).map((row, i) => (
                                            <tr key={i} className="hover:bg-indigo-50/50">
                                                <td className="px-4 py-3 font-mono text-xs">{row.platformOrderId}</td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{currencyFormatter.format(row.payoutAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedPreview.length > 50 && (
                                    <div className="text-center py-4 text-xs font-bold text-gray-400">
                                        + {parsedPreview.length - 50} more rows not shown.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Currently Pending Real-Time List */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm max-h-[600px] overflow-y-auto">
                    <h3 className="text-sm font-extrabold text-gray-800 mb-6 flex items-center justify-between">
                        Pending Database Orders
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </h3>

                    {!data ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-xl"></div>)}
                        </div>
                    ) : (data.pendingOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="text-2xl mb-2">✨</span>
                            <span className="text-sm font-bold text-gray-500">All Orders Reconciled</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.pendingOrders.map((order: any) => (
                                <div key={order.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black text-gray-500">{order.platformOrderId || order.id.slice(0, 8)}</span>
                                        <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-gray-200">{order.channel}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-medium text-gray-500">{new Date(order.createdAt).toLocaleDateString('th-TH')}</span>
                                        <span className="text-sm font-black text-gray-900">{currencyFormatter.format(order.total)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
