'use client';
import { useState } from 'react';
import { BoltIcon, DocumentTextIcon, BanknotesIcon, CheckBadgeIcon, ExclamationTriangleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function OMSZeroClickParserPage() {
    const [isParsing, setIsParsing] = useState(false);
    const [chatText, setChatText] = useState('');
    const [base64Slip, setBase64Slip] = useState('');
    const [aiResult, setAiResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setBase64Slip(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleParseOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatText.trim()) {
            toast.error("Please paste the customer chat log.");
            return;
        }

        setIsParsing(true);
        setAiResult(null);

        try {
            toast.loading("⚡ Gemini is structuring the invoice...", { duration: 4000 });

            const res = await fetch('/api/oms/orders/parser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    textData: chatText,
                    base64Image: base64Slip
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Parser failed");

            toast.success("✅ Order Successfully Forged!");
            setAiResult(data);
        } catch (error: any) {
            toast.error(error.message);
            console.error(error);
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-8 rounded-3xl shadow-xl border border-indigo-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <BoltIcon className="w-10 h-10 text-yellow-400" />
                        AI Zero-Click Order Parser
                    </h1>
                    <p className="mt-2 text-indigo-200 font-medium max-w-xl">
                        Instantly transform unstructured Social Commerce chats (LINE, TikTok, Facebook) into precise Database Invoices via Google Gemini 1.5 Pro.
                    </p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                    <span className="text-sm font-bold text-indigo-100">Model Active: </span>
                    <span className="text-sm font-black text-white">gemini-1.5-pro</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <DocumentTextIcon className="w-6 h-6 text-indigo-500" />
                        Customer Interaction Log
                    </h3>

                    <form onSubmit={handleParseOrder} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Paste Chat History Here</label>
                            <textarea
                                required
                                rows={8}
                                placeholder="เอาเดรสสีแดงไซต์ S 2 ตัวนะจ๊ะ ส่งของด่วนที่ลาดพร้าว จ่ายเงินแล้ว"
                                value={chatText}
                                onChange={e => setChatText(e.target.value)}
                                className="w-full border-2 border-indigo-50 bg-indigo-50/30 rounded-2xl p-4 font-medium text-gray-800 focus:border-indigo-500 focus:bg-white outline-none transition"
                            />
                            <p className="text-xs text-gray-400 mt-2 font-medium">Text can be messy. The AI will automatically standardize Thai addresses and fuzzy-match internal SKUs.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Payment Slip Evidence (Optional)</label>
                            <label className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50 transition rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer group">
                                <PhotoIcon className="w-10 h-10 text-gray-300 group-hover:text-indigo-400 mb-2 transition" />
                                <span className="font-bold text-gray-600 group-hover:text-indigo-600 transition">Upload Bank Transfer Slip</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>

                            {base64Slip && (
                                <div className="mt-4 relative w-32 h-32 rounded-xl overflow-hidden shadow-md border-2 border-indigo-100">
                                    <img src={base64Slip} alt="Bank Slip" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setBase64Slip('')}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            disabled={isParsing || !chatText}
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white py-4 rounded-xl font-black text-lg transition shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2"
                        >
                            {isParsing ? '🧠 Neural Net Parsing...' : '⚡ Generate Invoice & Deduct Stock'}
                        </button>
                    </form>
                </div>

                {/* Output Panel */}
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col items-center justify-center min-h-[500px]">
                    {!aiResult ? (
                        <div className="text-center text-gray-400 max-w-sm">
                            <BoltIcon className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                            <h4 className="text-lg font-bold text-gray-500">Awaiting Invoice Forging</h4>
                            <p className="text-sm mt-2">Parsed Orders will immediately write to the PostgreSQL database mapped dynamically to real-time Multi-Warehouse inventory.</p>
                        </div>
                    ) : (
                        <div className="w-full animate-slide-in-right space-y-6">
                            {/* Verdict Header */}
                            <div className={`p-5 rounded-2xl border flex items-start gap-4 ${aiResult.aiAnalysis?.financials?.isPaymentValid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                <div className={`p-3 rounded-xl shrink-0 ${aiResult.aiAnalysis?.financials?.isPaymentValid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {aiResult.aiAnalysis?.financials?.isPaymentValid ? <CheckBadgeIcon className="w-8 h-8" /> : <ExclamationTriangleIcon className="w-8 h-8" />}
                                </div>
                                <div>
                                    <h3 className={`font-black tracking-tight text-xl ${aiResult.aiAnalysis?.financials?.isPaymentValid ? 'text-emerald-900' : 'text-rose-900'}`}>
                                        Order #{aiResult.orderId?.slice(-6).toUpperCase()} Generated
                                    </h3>
                                    <p className={`text-sm font-bold mt-1 ${aiResult.aiAnalysis?.financials?.isPaymentValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {aiResult.aiAnalysis?.financials?.isPaymentValid ? 'Payment Slip Verified. Ready to Fulfill.' : 'Pending Financial Verification. Put on hold.'}
                                    </p>
                                </div>
                            </div>

                            {/* Customer Profile Extract */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Extracted Profile</h4>
                                <div className="font-bold text-gray-900 text-lg mb-1">{aiResult.aiAnalysis?.customer?.name}</div>
                                <div className="text-sm text-gray-600 mb-1">📞 {aiResult.aiAnalysis?.customer?.phone || 'No Phone Detected'}</div>
                                <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mt-3">
                                    {aiResult.aiAnalysis?.customer?.address}<br />
                                    {aiResult.aiAnalysis?.customer?.district}, {aiResult.aiAnalysis?.customer?.province} {aiResult.aiAnalysis?.customer?.postalCode}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Ordered Items Extract */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Items Mapped</h4>
                                    <div className="space-y-3">
                                        {aiResult.aiAnalysis?.items?.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-start">
                                                <div className="pr-4">
                                                    <div className="font-bold text-sm text-gray-900">{item.productName}</div>
                                                    <div className="text-xs text-gray-400 font-mono mt-1 mt-1">Ref: {item.productId?.slice(-6) || 'Unknown SKU'}</div>
                                                </div>
                                                <div className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm whitespace-nowrap">x{item.quantity}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Financials Summary */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-2 sm:col-span-1 flex flex-col justify-center text-center">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Required Amount</h4>
                                    <div className="text-2xl font-black text-gray-900">฿{aiResult.aiAnalysis?.financials?.calculatedTotal}</div>
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Slip Detected</h4>
                                        <div className="text-lg font-black text-indigo-600">{aiResult.aiAnalysis?.financials?.slipVerifiedAmount ? `฿${aiResult.aiAnalysis?.financials?.slipVerifiedAmount}` : 'None'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Dev Logs */}
                            <div className="bg-gray-100 p-4 rounded-xl">
                                <p className="font-mono text-xs text-gray-500 leading-relaxed font-bold">
                                    <span className="text-purple-600">AI Reasoning:</span> {aiResult.aiAnalysis?.technicalReasoning}
                                </p>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-xs font-bold text-gray-400">Model Confidence:</span>
                                    <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full" style={{ width: `${aiResult.aiAnalysis?.aiConfidenceScore || 0}%` }}></div>
                                    </div>
                                    <span className="text-xs font-black text-emerald-600">{aiResult.aiAnalysis?.aiConfidenceScore}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
