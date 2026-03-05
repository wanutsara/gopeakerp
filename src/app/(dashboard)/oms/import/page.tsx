'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CloudArrowUpIcon, SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon, CircleStackIcon, UsersIcon } from '@heroicons/react/24/outline';

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5 MB

function OmniImportContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [filePos, setFilePos] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false); // For upload phase
    const [pendingJobId, setPendingJobId] = useState<string | null>(null);
    const queryJobId = searchParams.get('jobId');

    // Sync URL queries down to state if the user clicks a notification while already on the page
    useEffect(() => {
        if (queryJobId) {
            setPendingJobId(queryJobId);
        }
    }, [queryJobId]);

    const [isSyncing, setIsSyncing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any[] | null>(null);
    const [syncStats, setSyncStats] = useState<any>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Polling Mechanism
    useEffect(() => {
        if (!pendingJobId) return;

        const checkStatus = async () => {
            try {
                const res = await fetch('/api/oms/orders/import/async', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'STATUS', jobId: pendingJobId })
                });
                const data = await res.json();

                if (data.success && data.job) {
                    if (data.job.status === 'COMPLETED') {
                        setAnalysisResult(data.job.resultJson);
                        setPendingJobId(null);
                        router.replace('/oms/import', undefined); // clear url params
                    } else if (data.job.status === 'FAILED') {
                        setError('AI Processing Failed: ' + data.job.errorLog);
                        setPendingJobId(null);
                        router.replace('/oms/import', undefined);
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        checkStatus(); // Initial check
        const interval = setInterval(checkStatus, 5000); // Poll every 5s

        return () => clearInterval(interval);
    }, [pendingJobId, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFilePos(e.target.files[0]);
            setAnalysisResult(null);
            setError('');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFilePos(e.dataTransfer.files[0]);
            setAnalysisResult(null);
            setError('');
        }
    };

    const handleAnalyze = async () => {
        if (!filePos) return;
        if (filePos.size > MAX_FILE_SIZE) {
            setError(`File is too large (${(filePos.size / 1024 / 1024).toFixed(1)}MB). Please split your export into files under 5MB to ensure AI Context Length is not exceeded.`);
            return;
        }

        setIsAnalyzing(true);
        setError('');
        try {
            const text = await filePos.text();

            // Send payload to Background Worker Endpoint
            const res = await fetch('/api/oms/orders/import/async', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'UPLOAD',
                    rawData: text,
                    fileName: filePos.name,
                    fileSize: filePos.size
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to upload file to Gemini Worker.');

            // Queue Ticket Received
            setPendingJobId(data.jobId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSync = async () => {
        if (!analysisResult) return;
        setIsSyncing(true);
        setError('');
        try {
            const res = await fetch('/api/oms/orders/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'SYNC', orders: analysisResult })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to sync to database');
            setSyncStats(data.results);
            setAnalysisResult(null); // Clear pending
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="p-8 max-w-full mx-auto flex flex-col gap-6 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <SparklesIcon className="w-8 h-8 text-fuchsia-600" />
                        Omni-AI Smart Importer (CDP Enabled)
                    </h1>
                    <p className="mt-2 text-gray-500">
                        Drop raw Sales Exports from Page365, Shipnity, Shopee, or TikTok. <br />
                        Google Gemini 3.1 Pro will autonomously extract orders in the background, build Customer Profiles, and deduct inventory.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-5 rounded-xl border border-red-200 flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon className="w-6 h-6" />
                        <h3 className="font-bold text-lg">AI Execution Error</h3>
                    </div>
                    <p className="font-medium text-red-600 pl-9">{error}</p>
                </div>
            )}

            {syncStats && (
                <div className="bg-emerald-50 text-emerald-800 p-8 rounded-3xl flex flex-col gap-4 border border-emerald-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-5%] p-8 opacity-10">
                        <CheckCircleIcon className="w-48 h-48 text-emerald-500" />
                    </div>
                    <div className="z-10 flex items-center gap-3">
                        <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
                        <h3 className="text-2xl font-bold">Sync Completed Successfully!</h3>
                    </div>

                    <ul className="space-y-2 font-medium z-10 text-emerald-700 text-lg">
                        <li className="flex items-center gap-2">🛒 <span className="font-bold">{syncStats.synced} Orders</span> injected into General Ledger</li>
                        <li className="flex items-center gap-2">📦 <span className="font-bold">{syncStats.stockUpdated} SKUs</span> successfully deducted from Inventory</li>
                        <li className="flex items-center gap-2 text-fuchsia-700">👥 <span className="font-bold">{syncStats.customersCreated || 0} New Customers</span> dynamically constructed in CDP/CRM</li>
                    </ul>

                    {syncStats.errors?.length > 0 && (
                        <div className="mt-4 p-4 bg-red-50 rounded-xl z-10 border border-red-100">
                            <h4 className="font-bold text-red-800 mb-2 items-center flex gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5" /> Warnings during sync:
                            </h4>
                            <ul className="text-sm text-red-600 list-disc pl-5 space-y-1">
                                {syncStats.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}

                    <button onClick={() => setSyncStats(null)} className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 rounded-xl font-bold w-fit z-10 transition-all hover:scale-105 active:scale-95">
                        Import Another File
                    </button>
                </div>
            )}

            {/* Asynchronous Background Status View */}
            {pendingJobId && !analysisResult && !syncStats && (
                <div className="bg-gradient-to-br from-fuchsia-50 to-purple-50 p-16 rounded-3xl border border-fuchsia-100 shadow-inner flex flex-col items-center justify-center text-center mt-4">
                    <div className="relative mb-8">
                        <div className="w-20 h-20 border-8 border-fuchsia-100 border-t-fuchsia-600 rounded-full animate-spin" />
                        <SparklesIcon className="w-8 h-8 text-fuchsia-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">AI Worker Processing...</h3>
                    <p className="text-fuchsia-800 font-medium text-lg max-w-lg mb-6 leading-relaxed">
                        Your massive dataset has been queued. Gemini 3.1 Pro is dynamically extracting CRM entities and identifying logistics SKUs in a detached background thread.
                        <br /><br />
                        <span className="bg-fuchsia-100/50 px-3 py-1 rounded text-fuchsia-900 font-bold border border-fuchsia-200">You can safely close this page or navigate elsewhere.</span>
                        <br />A Global Notification will alert you when your structured data is securely cached and ready for review.
                    </p>
                    <div className="px-5 py-2.5 bg-white rounded-full text-xs font-mono text-gray-500 shadow-sm border border-gray-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Session ID: {pendingJobId}
                    </div>
                </div>
            )}

            {!pendingJobId && !analysisResult && !syncStats && (
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-fuchsia-300 bg-gradient-to-b from-white to-fuchsia-50/30 rounded-3xl p-16 flex flex-col items-center justify-center text-center hover:bg-fuchsia-50/80 transition-all group shadow-sm mt-4"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border border-white">
                        <CloudArrowUpIcon className="w-12 h-12 text-fuchsia-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Drag and drop your Spreadsheet</h3>
                    <p className="text-gray-500 mb-8 max-w-md">Gemini's Context Window supports up to ~10,000 text rows per file. Drop .csv, .xlsx, or JSON text. Processing routes asynchronously to prevent browser crashes.</p>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv,.txt,.xlsx,.json"
                    />

                    <div className="flex gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-8 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 hover:shadow-md transition-all active:scale-95"
                        >
                            Select File
                        </button>

                        <button
                            disabled={!filePos || isAnalyzing}
                            onClick={handleAnalyze}
                            className={`px-8 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all active:scale-95 ${!filePos ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-xl shadow-fuchsia-600/30 hover:shadow-2xl hover:shadow-fuchsia-600/40 hover:-translate-y-1'}`}
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    Uploading to AI...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6" />
                                    Launch Background Job
                                </>
                            )}
                        </button>
                    </div>

                    {filePos && (
                        <div className="mt-8 flex items-center justify-center gap-3 text-sm font-bold text-purple-700 bg-purple-100/50 px-6 py-3 rounded-full border border-purple-200 shadow-inner">
                            <CircleStackIcon className="w-5 h-5" />
                            File Loaded: {filePos.name} ({(filePos.size / 1024).toFixed(1)} KB)
                        </div>
                    )}
                </div>
            )}

            {analysisResult && (
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mt-4">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                <SparklesIcon className="w-8 h-8 text-fuchsia-600" />
                                Extraction Preview (CDP Mode)
                            </h3>
                            <p className="text-gray-500 font-medium mt-2 max-w-lg">Omni-AI grouped {analysisResult.length} valid orders. Optionally set a Cut-off Date in the Global Settings to isolate Cash Flow tracking.</p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setAnalysisResult(null)}
                                    className="px-6 py-3 text-gray-600 font-bold bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm rounded-xl transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSyncing}
                                    onClick={handleSync}
                                    className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95 flex items-center gap-3"
                                >
                                    {isSyncing ? (
                                        <>
                                            <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                            Syncing Customers & Orders...
                                        </>
                                    ) : (
                                        <>
                                            <UsersIcon className="w-6 h-6" />
                                            Confirm & Build CDP
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-4 text-gray-500 font-bold uppercase tracking-wider text-xs">Customer (CDP)</th>
                                    <th className="px-5 py-4 text-gray-500 font-bold uppercase tracking-wider text-xs">Platform Channel</th>
                                    <th className="px-5 py-4 text-gray-500 font-bold uppercase tracking-wider text-xs">Address & Location</th>
                                    <th className="px-5 py-4 text-gray-500 font-bold uppercase tracking-wider text-xs">Order Date</th>
                                    <th className="px-5 py-4 text-gray-500 font-bold min-w-[200px] uppercase tracking-wider text-xs">Extracted SKUs</th>
                                    <th className="px-5 py-4 text-right text-gray-500 font-bold uppercase tracking-wider text-xs">Subtotal</th>
                                    <th className="px-5 py-4 text-right text-red-500 font-bold uppercase tracking-wider text-xs">Platform Fee</th>
                                    <th className="px-5 py-4 text-right text-emerald-600 font-bold uppercase tracking-wider text-xs">Net Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {analysisResult.map((order, idx) => (
                                    <tr key={idx} className="hover:bg-fuchsia-50/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 text-base">{order.customerName || 'Unknown Customer'}</span>
                                                {order.customerPhone && (
                                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">
                                                        {order.customerPhone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded text-xs font-black tracking-widest uppercase border border-indigo-100 shadow-sm">
                                                {order.channel || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 whitespace-normal max-w-[250px]">
                                            {order.province || order.address ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {order.address && <span className="text-sm font-bold text-gray-900 truncate" title={order.address}>{order.address}</span>}
                                                    <span className="text-xs text-gray-500">
                                                        {order.district && `${order.district},`} {order.province} {order.postalCode}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">No address detected</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-gray-600 font-medium">
                                            {order.date ? new Date(order.date).toLocaleDateString('en-GB') : '-'}
                                        </td>
                                        <td className="px-5 py-4">
                                            {order.items?.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {order.items.map((it: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                            <span className="font-bold text-gray-800">{it.sku}</span>
                                                            <span className="text-gray-400">×</span>
                                                            <span className="font-black text-indigo-600">{it.qty}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">No Items Found</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right font-black text-gray-900 text-base">
                                            ฿{Number(order.subtotal || order.total || 0).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4 text-right text-red-600 font-bold">
                                            -฿{Number(order.platformFee || 0).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4 text-right text-emerald-600 font-black text-base bg-emerald-50/50">
                                            ฿{Number(order.total || 0).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Wrap in Suspense to safely use useSearchParams in Next 13+ App Router
export default function OmniImportPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500 font-medium">Loading AI Workspace...</div>}>
            <OmniImportContent />
        </Suspense>
    );
}
