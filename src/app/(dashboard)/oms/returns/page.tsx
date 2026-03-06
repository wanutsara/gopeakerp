'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowUturnLeftIcon, ExclamationTriangleIcon, CheckBadgeIcon, CameraIcon, ReceiptRefundIcon, Cog8ToothIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
};

export default function OMSReturnsPage() {
    const { data: returns, error, mutate } = useSWR('/api/oms/returns', fetcher);

    // AI Simulator Modal State
    const [isSimulating, setIsSimulating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [rmaForm, setRmaForm] = useState({
        orderItemId: '',
        customerReason: '',
        base64Image: ''
    });

    const [aiReport, setAiReport] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setRmaForm({ ...rmaForm, base64Image: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const handleSimulateAI = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        setAiReport(null);

        try {
            toast.loading("👁️ Gemini Vision is inspecting the defect...", { duration: 4000 });

            const res = await fetch('/api/oms/returns/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rmaForm)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Vision Engine Error");

            toast.success("✅ Assessment Complete!");
            setAiReport(data.analysis);
            mutate();
        } catch (error: any) {
            toast.error(error.message);
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    if (error) return <div className="p-8 text-red-500">Error loading RMA Dashboard</div>;
    if (!returns) return <div className="p-8 text-gray-500 animate-pulse flex items-center gap-3"><Cog8ToothIcon className="w-6 h-6 animate-spin" /> Loading Reverse Logistics...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <ArrowUturnLeftIcon className="w-8 h-8 text-rose-500" />
                        AI Return Logistics (RMA)
                    </h1>
                    <p className="mt-1 text-gray-500 font-medium text-sm">Monitor incoming visual claims flagged autonomously by Google Gemini 1.5 Vision Pro.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSimulating(true)}
                        className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg"
                    >
                        <CameraIcon className="w-5 h-5" /> Simulate Customer Claim
                    </button>
                </div>
            </div>

            {/* Dashboard List */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <ReceiptRefundIcon className="w-5 h-5 text-gray-400" />
                    Active RMA Requests
                </h3>

                {returns && returns.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Ref ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Customer / Order</th>
                                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Items Affected</th>
                                    <th className="px-6 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">AI Verdict</th>
                                    <th className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {returns.map((ret: any) => (
                                    <tr key={ret.id} className="hover:bg-rose-50/30 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-rose-600">
                                            #{ret.id.slice(-6).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{ret.order?.customer?.name || 'Guest'}</div>
                                            <div className="text-xs text-gray-500">Ord: #{ret.orderId.slice(-6).toUpperCase()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {ret.items?.map((item: any) => (
                                                <div key={item.id} className="text-sm text-gray-800">
                                                    <span className="font-bold">{item.quantity}x</span> {item.orderItem?.productName || 'Unknown SKU'}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {ret.items?.map((item: any) => {
                                                const condition = item.condition;
                                                return condition === 'SELLABLE' ?
                                                    (<span key={item.id} className="bg-emerald-100 text-emerald-700 font-black px-3 py-1 rounded-full text-xs flex items-center justify-center gap-1 mx-auto w-max"><CheckBadgeIcon className="w-4 h-4" /> RESTOCK</span>) :
                                                    (<span key={item.id} className="bg-rose-100 text-rose-700 font-black px-3 py-1 rounded-full text-xs flex items-center justify-center gap-1 mx-auto w-max"><ExclamationTriangleIcon className="w-4 h-4" /> QUARANTINE</span>);
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <span className="font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">{ret.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                        <ArrowUturnLeftIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-bold">No Returns Initiated</p>
                        <p className="text-sm mt-1">When customers upload defective proofs, Gemini Vision will display judgements here.</p>
                    </div>
                )}
            </div>

            {/* AI Vision Simulator Modal */}
            {isSimulating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-gradient-to-r from-gray-900 to-rose-900 p-6 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-black">AI Customer Device Simulator</h2>
                                <p className="text-gray-300 text-sm font-medium">Upload physical damage evidence directly into the Neural Net.</p>
                            </div>
                            <button onClick={() => { setIsSimulating(false); setAiReport(null); setRmaForm({ orderItemId: '', customerReason: '', base64Image: '' }) }} className="hover:bg-white/20 p-2 rounded-full transition">✕</button>
                        </div>

                        <div className="overflow-y-auto p-6 flex-1 space-y-6">
                            {!aiReport ? (
                                <form id="ai-vision-form" onSubmit={handleSimulateAI} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Target Order Item ID (Required Database Ref)</label>
                                        <input required type="text" placeholder="e.g. cm7x...22x3" value={rmaForm.orderItemId} onChange={e => setRmaForm({ ...rmaForm, orderItemId: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-rose-500 outline-none" />
                                        <p className="text-xs text-gray-400 mt-1 font-medium">Tip: Copy an Order Item ID directly from Prisma Studio or Database to link the SKU.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Customer Stated Reason (Optional)</label>
                                        <textarea rows={2} placeholder="The screen arrived cracked on the top right." value={rmaForm.customerReason} onChange={e => setRmaForm({ ...rmaForm, customerReason: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-rose-500 outline-none"></textarea>
                                    </div>

                                    <div className="border-2 border-dashed border-rose-200 bg-rose-50/50 p-6 rounded-2xl text-center">
                                        <CameraIcon className="w-10 h-10 mx-auto text-rose-300 mb-2" />
                                        <label className="block text-sm font-black text-rose-600 mb-2 cursor-pointer hover:underline">
                                            Upload Defect Photographic Evidence
                                            <input required type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                        </label>
                                        {rmaForm.base64Image && (
                                            <div className="mt-4 border-4 border-white shadow-lg rounded-xl overflow-hidden w-48 h-48 mx-auto relative group">
                                                <img src={rmaForm.base64Image} className="w-full h-full object-cover" alt="Defect" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                    <span className="text-white font-bold text-sm">Image Locked</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    <div className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${aiReport.restockVerdict === 'QUARANTINE' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <div className={`p-3 rounded-xl ${aiReport.restockVerdict === 'QUARANTINE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {aiReport.restockVerdict === 'QUARANTINE' ? <ExclamationTriangleIcon className="w-8 h-8" /> : <CheckBadgeIcon className="w-8 h-8" />}
                                        </div>
                                        <div>
                                            <h3 className={`font-black tracking-tight text-xl ${aiReport.restockVerdict === 'QUARANTINE' ? 'text-rose-900' : 'text-emerald-900'}`}>{aiReport.restockVerdict}</h3>
                                            <p className={`text-sm font-bold ${aiReport.restockVerdict === 'QUARANTINE' ? 'text-rose-500' : 'text-emerald-500'}`}>AI Quality Assurance Decision</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                            <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Damage Severity</span>
                                            <div className="text-3xl font-black text-gray-900 mt-1">{aiReport.damageSeverityScore}<span className="text-lg text-gray-400">/10</span></div>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                            <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Fraud Probability</span>
                                            <div className="text-xl font-black text-gray-900 mt-2">{aiReport.fraudProbability}</div>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                                        <span className="text-xs text-indigo-400 font-black uppercase tracking-widest">Gemini Engine Technical Summary</span>
                                        <p className="text-indigo-900 font-medium text-sm mt-2 leading-relaxed tracking-wide">{aiReport.technicalSummary}</p>
                                    </div>
                                    <button onClick={() => { setAiReport(null); setRmaForm({ orderItemId: '', customerReason: '', base64Image: '' }); setIsSimulating(false); }} className="w-full text-center py-3 font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition">Acknowledge & Close</button>
                                </div>
                            )}
                        </div>

                        {!aiReport && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium">Model: gemini-1.5-pro</span>
                                <button form="ai-vision-form" disabled={isUploading || !rmaForm.base64Image || !rmaForm.orderItemId} type="submit" className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-rose-200 flex items-center gap-2">
                                    {isUploading ? 'Inspecting...' : 'Submit to AI Engine'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
