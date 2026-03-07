"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { useBrand } from '@/context/BrandContext';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const THAI_BANKS = [
    { code: 'KBANK', name: 'Kasikornbank (กสิกรไทย)', color: 'bg-[#00A950]', border: 'border-[#008A40]', icon: '🟢', text: 'text-white' },
    { code: 'SCB', name: 'Siam Commercial Bank (ไทยพาณิชย์)', color: 'bg-[#4E2A84]', border: 'border-[#3D206B]', icon: '🟣', text: 'text-white' },
    { code: 'BBL', name: 'Bangkok Bank (กรุงเทพ)', color: 'bg-[#1E4598]', border: 'border-[#14316D]', icon: '🔵', text: 'text-white' },
    { code: 'KTB', name: 'Krungthai Bank (กรุงไทย)', color: 'bg-[#00aeeef]', border: 'border-[#008CBB]', icon: '🩵', text: 'text-white' },
    { code: 'BAY', name: 'Bank of Ayudhya (กรุงศรี)', color: 'bg-[#FEC43B]', border: 'border-[#DAA222]', icon: '🟡', text: 'text-gray-900' },
    { code: 'TTB', name: 'TMBThanachart Bank (ทหารไทยธนชาต)', color: 'bg-[#0050F0]', border: 'border-[#003CB5]', icon: '🟠', text: 'text-white' },
    { code: 'GSB', name: 'Government Savings Bank (ออมสิน)', color: 'bg-[#EB198C]', border: 'border-[#C41372]', icon: '🩷', text: 'text-white' },
    { code: 'KSB', name: 'Kiatnakin Phatra (เกียรตินาคิน)', color: 'bg-[#6D6E71]', border: 'border-[#4D4E50]', icon: '⚪', text: 'text-white' },
    { code: 'CIMBT', name: 'CIMB Thai (ซีไอเอ็มบี)', color: 'bg-[#7E212E]', border: 'border-[#5C161F]', icon: '🔴', text: 'text-white' }
];

export default function BankAccountsDashboard() {
    const { activeBrandId, brands } = useBrand();

    // Auto-filter fetch if a specific brand is selected globally
    const endpoint = activeBrandId
        ? `/api/finance/bank-accounts?brandId=${activeBrandId}`
        : `/api/finance/bank-accounts`;

    const { data: accounts, mutate, error, isLoading } = useSWR(endpoint, fetcher);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        companyBrandId: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        branch: ''
    });

    const currencyFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading("กำลังผูกสมุดบัญชีกับนิติบุคคล...");
        try {
            const res = await fetch('/api/finance/bank-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("สร้างสมุดบัญชีสำเร็จ!", { id: loadingToast });
                setIsAddModalOpen(false);
                setFormData({ companyBrandId: '', bankName: '', accountNumber: '', accountName: '', branch: '' });
                mutate();
            } else {
                toast.error("เกิดข้อผิดพลาดในการสร้างสมุดบัญชี", { id: loadingToast });
            }
        } catch (err) {
            toast.error("Network Error", { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalVaultBalance = accounts?.reduce((sum: number, acc: any) => sum + (acc.computedBalance || 0), 0) || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Corporate Treasury
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">The Bank Vault</h1>
                    <p className="mt-2 text-sm font-medium text-gray-500">Manage isolated financial ledgers across multiple brands securely.</p>
                </div>

                <div className="relative z-10 text-right">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Total Vault Liquidity</span>
                    <span className="text-4xl font-black text-emerald-600 tracking-tighter shadow-sm">{currencyFormatter.format(totalVaultBalance)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    Active Ledgers
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{accounts?.length || 0}</span>
                </h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-full font-bold shadow-md transition-all hover:scale-105 active:scale-95 text-sm"
                >
                    + Add Corporate Account
                </button>
            </div>

            {/* Ledgers Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/50 animate-pulse rounded-3xl border border-gray-100"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts?.map((acc: any) => {
                        const bankDef = THAI_BANKS.find(b => b.code === acc.bankName) || { color: 'bg-white', border: 'border-gray-200', icon: '🏛️', text: 'text-gray-800', name: acc.bankName };

                        return (
                            <div key={acc.id} className={`group ${bankDef.color === 'bg-white' ? 'bg-white' : bankDef.color + ' ' + bankDef.text} p-6 rounded-3xl border-2 ${bankDef.border} shadow-sm hover:shadow-2xl transition-all duration-300 relative overflow-hidden hover:-translate-y-1 flex flex-col`}>
                                <div className="absolute top-0 right-0 p-4 opacity-30 text-6xl group-hover:scale-110 transition-transform duration-500">{bankDef.icon}</div>

                                <div className="relative z-10 flex-1">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2 py-1 bg-white/20 text-[10px] font-black uppercase tracking-wider rounded-md border border-white/30 backdrop-blur-sm">
                                            {acc.companyBrand?.name || 'Unassigned'}
                                        </span>
                                        {acc.companyBrand?.isHQ && (
                                            <span className="px-2 py-1 bg-white/20 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm backdrop-blur-sm">HQ</span>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-black mb-1 drop-shadow-sm">{bankDef.name}</h3>
                                    <p className="text-sm font-mono tracking-widest opacity-90">{acc.accountNumber}</p>
                                    <p className="text-xs font-bold mt-1 uppercase opacity-70">{acc.accountName}</p>
                                    {acc.branch && <p className="text-[10px] opacity-60 mt-0.5">สาขา {acc.branch}</p>}
                                </div>

                                <div className="relative z-10 mt-8 pt-6 border-t border-white/20 flex flex-col gap-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Live Balance</span>
                                        <span className={`text-2xl font-black drop-shadow-sm ${acc.computedBalance < 0 ? 'text-red-300' : ''}`}>
                                            {currencyFormatter.format(acc.computedBalance || 0)}
                                        </span>
                                    </div>
                                    <a href={`/finance/bank-accounts/${acc.id}`} className="w-full text-center py-2.5 bg-black/20 hover:bg-black/40 rounded-xl font-bold text-sm backdrop-blur-md transition-colors border border-white/10 shadow-sm flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Manage Statements
                                    </a>
                                </div>
                            </div>
                        )
                    })}

                    {accounts?.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[3rem] bg-gray-50/50">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-2xl">🏦</div>
                            <h3 className="text-lg font-bold text-gray-800">No Bank Accounts Found</h3>
                            <p className="text-sm text-gray-500 mt-2 max-w-sm text-center">
                                {activeBrandId
                                    ? `There are no linked accounts for this specific subsidiary. Add one to start tracking cash flow.`
                                    : `Initialize your corporate treasury by adding your first bank account.`}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Add Corporate Account</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold transition-colors">×</button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Subsidiary / Brand Owner</label>
                                <select
                                    required
                                    value={formData.companyBrandId}
                                    onChange={(e) => setFormData({ ...formData, companyBrandId: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-3 font-bold"
                                >
                                    <option value="" disabled>Select Legal Entity...</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} {b.isHQ ? '(HQ)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Bank Name</label>
                                    <select
                                        required
                                        value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-3 font-bold"
                                    >
                                        <option value="" disabled>Select Bank...</option>
                                        {THAI_BANKS.map(bank => (
                                            <option key={bank.code} value={bank.code}>{bank.icon} {bank.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Branch</label>
                                    <input
                                        type="text" placeholder="e.g. Sukhumvit"
                                        value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-3 font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Account Number</label>
                                <input
                                    type="text" required placeholder="xxx-x-xxxxx-x"
                                    value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-3 font-mono tracking-widest"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Account Name</label>
                                <input
                                    type="text" required placeholder="e.g. GOPEAK Holding Co., Ltd."
                                    value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-3 font-bold"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-6 text-white bg-emerald-600 hover:bg-emerald-700 font-black rounded-xl text-sm px-5 py-4 text-center shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                Secure Ledger Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
