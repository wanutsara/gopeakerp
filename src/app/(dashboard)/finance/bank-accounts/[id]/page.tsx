"use client";

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { THAI_BANKS } from '../page';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, CloudArrowUpIcon, DocumentTextIcon, PhotoIcon, CheckCircleIcon, CurrencyDollarIcon, ViewfinderCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function BankAccountOmniUpload({ params }: { params: { id: string } }) {
    const { data: acc, error, mutate, isLoading } = useSWR(`/api/finance/bank-accounts/${params.id}`, fetcher);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    // AI Staging Simulator State
    const [aiProcessing, setAiProcessing] = useState(false);
    const [stagedItems, setStagedItems] = useState<any[]>([]);

    const currencyFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 });

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) processUpload(files);
    };

    const processUpload = async (files: FileList) => {
        setUploading(true);
        const file = files[0];
        const loadingToast = toast.loading(`Uploading ${file.name}...`);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`/api/finance/bank-accounts/${params.id}/extract`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setUploading(false);
                setAiProcessing(true);
                toast.success("File uploaded! AI is analyzing the statement...", { id: loadingToast });

                // Small visual transition after server response
                setTimeout(() => {
                    setAiProcessing(false);
                    setStagedItems(data.items || []);
                    toast.success(`AI extraction completed! ${data.items?.length || 0} records found.`);
                }, 800);
            } else {
                toast.error(data.error || "Upload failed", { id: loadingToast });
                setUploading(false);
            }
        } catch (e) {
            toast.error("Network error during upload.", { id: loadingToast });
            setUploading(false);
        }
    };

    const confirmStaging = async () => {
        const toastId = toast.loading("Injecting AI Records into Global Ledger...");
        try {
            const res = await fetch(`/api/finance/bank-accounts/${params.id}/reconcile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stagedItems })
            });

            if (res.ok) {
                setStagedItems([]);
                mutate(); // Refresh the live balance
                toast.success("Reconciliation Successful! Cash Flow Map updated.", { id: toastId });
            } else {
                const err = await res.json();
                toast.error(err.error || "Reconciliation failed.", { id: toastId });
            }
        } catch (e) {
            toast.error("Network error.", { id: toastId });
        }
    };

    if (error) return <div className="p-8 text-red-500">Failed to load Bank Vault.</div>;
    if (isLoading || !acc) return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="h-40 bg-gray-200 animate-pulse rounded-3xl"></div>
            <div className="h-96 bg-gray-100 animate-pulse rounded-3xl"></div>
        </div>
    );

    const bankDef = THAI_BANKS.find(b => b.code === acc.bankName) || { color: 'bg-gray-800', border: 'border-gray-900', icon: '🏛️', text: 'text-white', name: acc.bankName };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-32">

            {/* Top Navigation */}
            <div className="flex items-center gap-4">
                <Link href="/finance/bank-accounts" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-500" />
                </Link>
                <div className="font-bold text-gray-500 text-sm uppercase tracking-widest hidden md:block">
                    Corporate Treasury / Statement Importer
                </div>
            </div>

            {/* Dynamic Bank Banner */}
            <div className={`relative overflow-hidden rounded-[2.5rem] ${bankDef.color} ${bankDef.text} shadow-2xl transition-all duration-700`}>
                <div className="absolute top-[-50%] right-[-10%] opacity-20 text-[20rem] font-black transform rotate-12 pointer-events-none select-none">
                    {bankDef.icon}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent pointer-events-none"></div>

                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-[10px] font-black uppercase tracking-wider rounded-md border border-white/30 backdrop-blur-sm mb-6">
                            {acc.companyBrand?.name || 'Unassigned Entity'} {acc.companyBrand?.isHQ ? '(HQ)' : ''}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 drop-shadow-sm">{bankDef.name}</h1>
                        <p className="text-lg md:text-xl font-mono tracking-widest opacity-90">{acc.accountNumber}</p>
                        <p className="text-sm font-bold uppercase opacity-80 mt-1">{acc.accountName} {acc.branch && `- ${acc.branch}`}</p>
                    </div>

                    <div className="text-right w-full md:w-auto mt-4 md:mt-0 p-6 bg-black/20 rounded-3xl backdrop-blur-md border border-white/10 shadow-inner">
                        <span className="text-sm font-bold uppercase tracking-wider opacity-80 block mb-1">Live Synchronized Balance</span>
                        <span className="text-4xl md:text-5xl font-black drop-shadow-md">
                            {currencyFormatter.format(acc.computedBalance || 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Omni-Upload Center */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Drag and Drop Zone */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-3">
                        <CloudArrowUpIcon className="w-8 h-8 text-emerald-500" /> Omni-Upload Zone
                    </h2>

                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative w-full h-80 rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center p-8 transition-all duration-300 origin-center 
                            ${isDragging ? 'border-emerald-500 bg-emerald-50 scale-[1.02] shadow-2xl' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300'}`}
                    >
                        {uploading ? (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="font-bold text-gray-500">Uploading payload...</p>
                            </div>
                        ) : aiProcessing ? (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                <ViewfinderCircleIcon className="w-20 h-20 text-indigo-500 animate-pulse" />
                                <p className="font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">AI Vision OCR Extracting Data...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center transform -rotate-6">
                                        <DocumentTextIcon className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center transform rotate-6 scale-110 z-10">
                                        <CloudArrowUpIcon className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center transform rotate-12">
                                        <PhotoIcon className="w-8 h-8 text-purple-500" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-gray-800 text-center mb-2">Drag & Drop Bank Statements</h3>
                                <p className="text-gray-500 text-sm xl:text-base text-center max-w-md font-medium">
                                    Supports K-Cyber, SCB Anywhere CSV files, <strong className="text-indigo-600">or simply upload Payment e-Slips (Images)</strong> for automatic AI OCR parsing.
                                </p>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv,.xlsx,image/*"
                                    onChange={(e) => e.target.files && processUpload(e.target.files)}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-8 bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all active:scale-95"
                                >
                                    Browse Files
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Staging & Manual Entry */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50">
                        <h3 className="font-black text-lg text-gray-900 flex items-center gap-2 mb-4">
                            <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></span>
                            AI Reconciliation Staging
                        </h3>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Unreconciled Transactions</p>

                        <AnimatePresence>
                            {stagedItems.length === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CheckCircleIcon className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-400">Ledger is fully updated.</span>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                    {stagedItems.map(item => (
                                        <div key={item.id} className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3 w-full">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${item.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {item.type === 'INCOME' ? '+' : '-'}
                                                </div>
                                                <div className="w-full">
                                                    <div className="flex justify-between w-full">
                                                        <span className="font-bold text-sm text-gray-900 line-clamp-1">{item.desc}</span>
                                                        <span className={`font-black text-sm ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {currencyFormatter.format(item.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-xs text-gray-400 font-medium">{item.matchedOrderId ? "Auto-Matched" : "Unmatched"}</span>
                                                        <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded flex items-center gap-1">
                                                            <ViewfinderCircleIcon className="w-3 h-3" /> {item.confidence}% Match
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={confirmStaging}
                                        className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" /> Confirm & Reconcile
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Manual Initial Balance Tool */}
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-2">
                            <CurrencyDollarIcon className="w-5 h-5 text-gray-400" /> Manual Initialization
                        </h3>
                        <p className="text-xs text-gray-500 mb-4 font-medium">If this is a newly created ledger, inject the Opening Balance directly without importing statements.</p>
                        <button
                            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 pt-3 rounded-xl border border-gray-300 shadow-sm transition-colors text-sm"
                            onClick={() => alert('Opening Balance Entry Module - Coming Soon!')}
                        >
                            Set Opening Cash Balance
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
