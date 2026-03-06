"use client";

import { useState } from "react";
import useSWR from "swr";
import { DocumentCheckIcon, CurrencyDollarIcon, PresentationChartLineIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
};

export default function AccountsPayableDashboard() {
    const { data: liabilities, mutate, error } = useSWR("/api/finance/ap", fetcher);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Payout Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [payoutNotes, setPayoutNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (error) return <div className="p-8 text-red-500">Failed to load Accounts Payable.</div>;
    if (!liabilities) return <div className="p-8 text-gray-500 animate-pulse">Scanning Liabilities System...</div>;

    const selectedItems = liabilities.filter((item: any) => selectedIds.includes(item.id));
    const totalSelectedAmount = selectedItems.reduce((acc: number, item: any) => acc + item.amount, 0);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(liabilities.map((i: any) => i.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleExecutePayout = async () => {
        if (selectedItems.length === 0) return;
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/finance/disbursements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: selectedItems,
                    totalAmount: totalSelectedAmount,
                    notes: payoutNotes,
                    bankAccountId: "MAIN_BKK_BANK", // Example strict string
                    slipUrl: "https://example.com/slip-placeholder.png" // Mocked for speed
                })
            });

            if (!res.ok) throw new Error("Payout Failed");

            setIsModalOpen(false);
            setPayoutNotes("");
            setSelectedIds([]);
            mutate(); // Refresh the AP Queue
            alert("Disbursement executed successfully! Status moved to PAID.");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Accounts Payable (รอจ่ายเงิน)</h1>
                    <p className="mt-1 text-sm text-gray-500">รวมศูนย์การเบิกจ่ายทั้งหมด (ใบเบิกพนักงาน, เงินเดือน, ใบสั่งซื้อ) ระบบโลกแห่งความโปร่งใส</p>
                </div>
                {selectedItems.length > 0 && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 hover:-translate-y-0.5 transition-all"
                    >
                        <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                        Execute Payout (฿{totalSelectedAmount.toLocaleString()})
                    </button>
                )}
            </div>

            {/* Global Liability Queue */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <DocumentCheckIcon className="w-5 h-5 text-gray-400" />
                        Approved Liabilities Queue
                    </h3>
                    <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                        {liabilities.length} Pending
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                                        checked={selectedIds.length === liabilities.length && liabilities.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4">ประเภท (Type)</th>
                                <th className="px-6 py-4">เรื่อง / หัวข้อ</th>
                                <th className="px-6 py-4">ผู้รับเงิน (Payee)</th>
                                <th className="px-6 py-4 text-right">จำนวนเงิน (บาท)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {liabilities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                            <DocumentCheckIcon className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="font-bold">เคลียร์ทุกยอดเรียบร้อย</p>
                                        <p className="text-xs mt-1">ไม่มีใบเบิกหรือเงินเดือนค้างจ่ายในระบบ</p>
                                    </td>
                                </tr>
                            ) : (
                                liabilities.map((item: any) => (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-red-50/30 transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-red-50/50' : ''}`}
                                        onClick={() => handleSelect(item.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                readOnly
                                                className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 pointer-events-none"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.type === 'EXPENSE' ? 'bg-blue-100 text-blue-700' :
                                                    item.type === 'PAYROLL' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-orange-100 text-orange-700'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.title}</td>
                                        <td className="px-6 py-4 text-gray-500">{item.payee}</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900">
                                            ฿{item.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Overlay directly implemented */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-8 duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                                <CurrencyDollarIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Authorize Transfer</h3>
                                <p className="text-sm text-gray-500">สั่งโอนเงิน {selectedItems.length} รายการ</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-6 flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Outflow</span>
                            <span className="text-5xl font-black text-gray-900 mt-2 tracking-tighter">฿{totalSelectedAmount.toLocaleString()}</span>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">บันทึกช่วยจำ (Notes)</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                    placeholder="เช่น โอนรอบเช้าวันที่ 6 มี.ค."
                                    rows={3}
                                    value={payoutNotes}
                                    onChange={(e) => setPayoutNotes(e.target.value)}
                                />
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700 text-sm">
                                <PresentationChartLineIcon className="w-5 h-5 flex-shrink-0" />
                                <p>เมื่อกดยืนยัน ระบบจะปรับสถานะย่อยทั้งหมดเป็น PAID และสร้าง Transaction ตัดยอด Cash Flow อัตโนมัติ</p>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExecutePayout}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 focus:ring-4 focus:ring-red-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? 'Executing...' : 'Confirm Transfer & Lock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
