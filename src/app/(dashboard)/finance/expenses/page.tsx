"use client";

import { useState } from "react";
import useSWR from "swr";
import { PlusIcon, CheckCircleIcon, XCircleIcon, BanknotesIcon, DocumentTextIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import ExpenseModal from "./ExpenseModal";
import { useSession } from "next-auth/react";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
};

export default function ExpensesPage() {
    const { data: session } = useSession();
    const { data: expenses, error, mutate } = useSWR("/api/finance/expenses", fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Status Action
    const updateStatus = async (id: string, status: string) => {
        if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${status} ?`)) return;
        try {
            const res = await fetch(`/api/finance/expenses/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            mutate();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const deleteRequest = async (id: string) => {
        if (!confirm("ยืนยันการลบคำขอนี้?")) return;
        try {
            const res = await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("ลบไม่สำเร็จ");
            mutate();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (error) return <div className="p-8 text-red-500">Failed to load expenses</div>;
    if (!expenses || !session) return <div className="p-8 text-gray-500 animate-pulse">Loading procurement data...</div>;

    const isAdmin = session.user?.role === "OWNER" || session.user?.role === "MANAGER";

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">รออนุมัติ</span>;
            case "APPROVED": return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">อนุมัติแล้ว</span>;
            case "PAID": return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">จ่ายเงินแล้ว</span>;
            case "REJECTED": return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">ไม่อนุมัติ</span>;
            default: return <span>{status}</span>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ระบบขออนุมัติเบิกจ่าย (PO & Expenses)</h1>
                    <p className="mt-1 text-sm text-gray-500">สร้างใบขอซื้อหรือใบเบิกค่าใช้จ่าย เพื่อให้หัวหน้าพิจารณาอนุมัติ และตัดจ่ายลงบัญชี</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition shadow-sm"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    ขอเบิกค่าใช้จ่าย (New Request)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
                    <DocumentTextIcon className="w-8 h-8 text-orange-500 mb-2" />
                    <p className="text-sm font-bold text-orange-700">รออนุมัติ (Pending)</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{expenses.filter((e: any) => e.status === "PENDING").length} <span className="text-lg font-medium text-gray-500">ใบ</span></p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <CheckCircleIcon className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-sm font-bold text-blue-700">รอจ่ายเงิน (Approved)</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{expenses.filter((e: any) => e.status === "APPROVED").length} <span className="text-lg font-medium text-gray-500">ใบ</span></p>
                </div>
                <div className="bg-green-50 rounded-2xl p-6 border border-green-100 md:col-span-2 flex items-center justify-between">
                    <div>
                        <BanknotesIcon className="w-8 h-8 text-green-500 mb-2" />
                        <p className="text-sm font-bold text-green-700">ยอดเบิกจ่ายสำเร็จแล้ว (Paid)</p>
                        <p className="text-3xl font-black text-gray-900 mt-1">
                            ฿{expenses.filter((e: any) => e.status === "PAID").reduce((sum: number, e: any) => sum + e.amount, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">วันที่ขอ</th>
                                <th className="px-6 py-4">เรื่อง / ผู้ขอเบิก</th>
                                <th className="px-6 py-4 text-right">ยอดเงิน (บาท)</th>
                                <th className="px-6 py-4">สถานะ</th>
                                <th className="px-6 py-4 text-right">จัดการ (Actions)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">ยังไม่มีประวัติการขอเบิกจ่าย</td>
                                </tr>
                            ) : (
                                expenses.map((req: any) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(req.createdAt).toLocaleDateString("th-TH")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{req.title}</div>
                                            <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                                                <span>ผู้ขอ: {req.requestor?.user?.name || "Unknown"}</span>
                                                <span className="text-gray-300">|</span>
                                                <span>หมวด: {req.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900 text-base">
                                            ฿{req.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.status)}
                                            {req.transaction && req.status === "PAID" && (
                                                <div className="text-[10px] text-green-600 font-bold mt-1 flex items-center">
                                                    <DocumentDuplicateIcon className="w-3 h-3 mr-0.5" /> ลงบัญชีรายจ่ายแล้ว
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {isAdmin && req.status === "PENDING" && (
                                                <>
                                                    <button onClick={() => updateStatus(req.id, "APPROVED")} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg transition">
                                                        อนุมัติ
                                                    </button>
                                                    <button onClick={() => updateStatus(req.id, "REJECTED")} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs rounded-lg transition">
                                                        ไม่อนุมัติ
                                                    </button>
                                                </>
                                            )}
                                            {isAdmin && req.status === "APPROVED" && (
                                                <button onClick={() => updateStatus(req.id, "PAID")} className="px-3 py-1.5 bg-green-500 text-white hover:bg-green-600 font-bold text-xs rounded-lg shadow-sm transition">
                                                    ทำจ่ายเงิน (ลงบัญชี)
                                                </button>
                                            )}
                                            {(!isAdmin || req.status === "PENDING" || req.status === "REJECTED") && (
                                                <button onClick={() => deleteRequest(req.id)} disabled={req.status === "PAID"} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30" title="ลบรายการ">
                                                    <XCircleIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && <ExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={() => mutate()} />}
        </div>
    );
}
