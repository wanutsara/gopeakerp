"use client";

import { useState } from "react";
import useSWR from "swr";
import { BanknotesIcon, ArrowTrendingUpIcon, DocumentTextIcon, ChartPieIcon, PlusIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
};

export default function CashFlowDashboard() {
    const { data: analytics, error: analyticsError } = useSWR("/api/finance/analytics", fetcher);
    // Realistically you would fetch transactions with SWR too
    const { data: transactions, mutate: mutateTx } = useSWR("/api/finance/transactions", fetcher);
    const [isAddingTx, setIsAddingTx] = useState(false);
    const [txForm, setTxForm] = useState({ type: "INCOME", amount: "", category: "SALES_REVENUE", description: "" });
    const [loadingTx, setLoadingTx] = useState(false);

    // Edit Add Delete States
    const [editTx, setEditTx] = useState<any>(null);
    const [deleteTx, setDeleteTx] = useState<any>(null);
    const [loadingAction, setLoadingAction] = useState(false);

    if (analyticsError) return <div className="p-8 text-red-500">Failed to load financial data.</div>;
    if (!analytics || !transactions) return <div className="p-8 text-gray-500 animate-pulse">Analyzing Cash Flow...</div>;

    // Charts Data Prep
    const pieData = {
        labels: (analytics?.channelSales || []).map((c: any) => c.channel),
        datasets: [{
            data: (analytics?.channelSales || []).map((c: any) => c.revenue),
            backgroundColor: ['#3b82f6', '#f97316', '#000000', '#22c55e', '#ec4899', '#8b5cf6'],
            borderWidth: 0,
        }]
    };

    const handleAddTx = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingTx(true);
        try {
            await fetch("/api/finance/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(txForm)
            });
            mutateTx();
            setIsAddingTx(false);
            setTxForm({ type: "INCOME", amount: "", category: "SALES_REVENUE", description: "" });
        } catch (err) {
            alert("Error saving transaction");
        } finally {
            setLoadingTx(false);
        }
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingAction(true);
        try {
            await fetch(`/api/finance/transactions/${editTx.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editTx)
            });
            mutateTx();
            setEditTx(null);
        } catch (err) {
            alert("Error updating");
        } finally {
            setLoadingAction(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setLoadingAction(true);
        try {
            await fetch(`/api/finance/transactions/${deleteTx.id}`, {
                method: "DELETE"
            });
            mutateTx();
            setDeleteTx(null);
        } catch (err) {
            alert("Error deleting");
        } finally {
            setLoadingAction(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">กระแสเงินสด & ยอดขาย (Finance & OMS)</h1>
                    <p className="mt-1 text-sm text-gray-500">มอนิเตอร์ยอดขายจากทุกช่องทาง เปรียบเทียบกับเงินสดที่รับเข้าจริง เพื่อดูยอดค้างรับ</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DocumentTextIcon className="w-24 h-24 text-blue-600" /></div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">ยอดขายรวมสุทธิ (Sales Revenue)</p>
                    <p className="text-4xl font-extrabold text-gray-900 mt-2">
                        <span className="text-2xl text-gray-400 mr-1">฿</span>
                        {(analytics?.channelSales || []).reduce((acc: number, c: any) => acc + c.revenue, 0).toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-blue-600 mt-2 bg-blue-50 inline-block px-2 py-1 rounded">จากทุกแพลตฟอร์ม</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 right-0 p-4 opacity-10"><BanknotesIcon className="w-24 h-24 text-red-600" /></div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider relative z-10">ยอดเงินค้างรับ (Accounts Receivable)</p>
                    <p className="text-4xl font-extrabold text-red-600 mt-2 relative z-10">
                        <span className="text-2xl text-red-400 mr-1">฿</span>
                        {analytics.accountsReceivable.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-red-600 mt-2 bg-red-100 inline-block px-2 py-1 rounded relative z-10">เงินที่แพลตฟอร์มยังไม่โอนให้</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-lg shadow-green-500/20 relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowTrendingUpIcon className="w-24 h-24 text-white" /></div>
                    <p className="text-sm font-bold text-green-100 uppercase tracking-wider relative z-10">เงินสดที่เข้าบัญชีแล้ว (Cash Received)</p>
                    <p className="text-4xl font-extrabold mt-2 relative z-10">
                        <span className="text-2xl text-green-300 mr-1">฿</span>
                        {analytics.cashReceived.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-white/90 mt-2 bg-white/20 inline-block px-2 py-1 rounded relative z-10">บัญชีธนาคารบริษัท</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">รายจ่ายรวม (Total Expenses)</p>
                        <p className="text-4xl font-black text-gray-900 mt-2">
                            <span className="text-2xl text-red-500 mr-1">฿</span>
                            {(analytics?.totalExpenses || 0).toLocaleString()}
                        </p>
                        <p className="text-xs font-medium text-red-600 mt-2 bg-red-50 inline-block px-2 py-1 rounded">Outbound Cash (Payroll, PO, etc.)</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Sales Distribution (Revenue) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <ChartPieIcon className="w-5 h-5 text-indigo-500" />
                        สัดส่วนรายได้ตามแพลตฟอร์ม (Revenue)
                    </h3>
                    {(analytics?.channelSales || []).length > 0 ? (
                        <div className="relative h-64 w-full flex justify-center mt-4">
                            <Doughnut data={pieData} options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom' } } }} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-30px]">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                <span className="text-2xl font-black text-gray-900">
                                    {(analytics?.channelSales || []).reduce((acc: number, c: any) => acc + c.orders, 0).toLocaleString()}
                                </span>
                                <span className="text-xs font-medium text-gray-500">Orders</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">ไม่มีข้อมูลการขาย</div>
                    )}
                </div>

                {/* 2. Top Products */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ArrowTrendingUpIcon className="w-6 h-6 text-orange-500" />
                            สินค้าขายดี 5 อันดับแรก (Top Products)
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">ลำดับ</th>
                                    <th className="px-4 py-3">ชื่อสินค้า / Base Product</th>
                                    <th className="px-4 py-3 text-right rounded-r-lg">จำนวนที่ขายได้ (ชิ้น)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(analytics?.topProducts || []).map((p: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-bold text-gray-400">#{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-600">{p.quantity.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {(analytics?.topProducts || []).length === 0 && (
                                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">ไม่มีข้อมูลออร์เดอร์</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Transactions Log Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">บันทึกกระแสเงินสด (Cash Flow Log)</h3>
                        <p className="text-xs text-gray-500 mt-1">สมุดบัญชีสำหรับจดเงินเข้า-ออกบริษัทด้วยมือแบบง่ายๆ</p>
                    </div>
                    <button onClick={() => setIsAddingTx(!isAddingTx)} className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition">
                        <PlusIcon className="w-4 h-4 mr-2" />เพิ่มรายการ
                    </button>
                </div>

                {isAddingTx && (
                    <form onSubmit={handleAddTx} className="p-6 bg-blue-50/50 border-b border-blue-100 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ประเภท</label>
                            <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                                <option value="INCOME">รายรับ (Income)</option>
                                <option value="EXPENSE">รายจ่าย (Expense)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">หมวดหมู่</label>
                            <select value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                                <option value="SALES_REVENUE">รายรับจากการขาย</option>
                                <option value="SHIPPING">ค่าขนส่ง</option>
                                <option value="ADVERTISING">ค่าโฆษณา</option>
                                <option value="OTHER">อื่นๆ</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียด</label>
                            <input required type="text" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="เช่น ยอดโอน Shopee รอบ 1-15 ม.ค." className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                            <div className="flex gap-2">
                                <input required type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                                <button type="submit" disabled={loadingTx} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700">บันทึก</button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">วันที่รับ/จ่าย</th>
                                <th className="px-6 py-4">ประเภท</th>
                                <th className="px-6 py-4">หมวดหมู่</th>
                                <th className="px-6 py-4">รายละเอียด</th>
                                <th className="px-6 py-4 text-right">จำนวนเงิน (บาท)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(transactions || []).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">ไม่มีประวัติรุกรรมกระแสเงินสด</td>
                                </tr>
                            ) : (
                                (transactions || []).map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-3 text-gray-500">{new Date(tx.date).toLocaleDateString('th-TH')}</td>
                                        <td className="px-6 py-3">
                                            {tx.type === "INCOME" ?
                                                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md">INCOME</span> :
                                                <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-md">EXPENSE</span>
                                            }
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 text-xs">{tx.category}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{tx.description}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className={`font-bold ${tx.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                                                    {tx.type === "INCOME" ? "+" : "-"}฿{tx.amountTHB.toLocaleString()}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditTx({ ...tx, date: new Date(tx.date).toISOString().split('T')[0] })} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"><PencilSquareIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => setDeleteTx(tx)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editTx && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleEditSave} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200 p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">แก้ไขบันทึก (Edit Record)</h3>
                            <button type="button" onClick={() => setEditTx(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">ประเภท</label>
                                <select value={editTx.type} onChange={e => setEditTx({ ...editTx, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 uppercase font-medium">
                                    <option value="INCOME">รายรับ (Income)</option>
                                    <option value="EXPENSE">รายจ่าย (Expense)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">หมวดหมู่</label>
                                <input value={editTx.category || ""} onChange={e => setEditTx({ ...editTx, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียด</label>
                            <input value={editTx.description || ""} onChange={e => setEditTx({ ...editTx, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                                <input type="number" step="0.01" value={editTx.amount} onChange={e => setEditTx({ ...editTx, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">วันที่รับ/จ่าย</label>
                                <input type="date" value={editTx.date} onChange={e => setEditTx({ ...editTx, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setEditTx(null)} disabled={loadingAction} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors">ยกเลิก</button>
                            <button type="submit" disabled={loadingAction} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center min-w-[120px]">
                                {loadingAction ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'บันทึกการแก้ไข'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTx && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative border border-gray-100 flex flex-col items-center text-center animate-in fade-in duration-200">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 border-8 border-red-50/50">
                            <TrashIcon className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">ลบรายการบัญชี?</h3>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            รายการ <b>"{deleteTx.description}"</b> จำนวน <b className={deleteTx.type === "INCOME" ? "text-green-600" : "text-red-600"}>฿{deleteTx.amountTHB?.toLocaleString()}</b> จะถูกลบถาวรจากกระแสเงินสด แน่ใจหรือไม่?
                        </p>
                        <div className="flex w-full gap-3">
                            <button onClick={() => setDeleteTx(null)} disabled={loadingAction} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all">ยกเลิก</button>
                            <button onClick={handleDeleteConfirm} disabled={loadingAction} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center">
                                {loadingAction ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
