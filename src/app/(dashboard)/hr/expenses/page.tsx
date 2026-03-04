"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckCircleIcon, XCircleIcon, BanknotesIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExpensesAdminPage() {
    const [confirmModalData, setConfirmModalData] = useState<{ id: string, status: string } | null>(null);
    const { data: expenses, error, isLoading, mutate } = useSWR("/api/hr/expenses", fetcher);

    const executeStatusUpdate = async () => {
        if (!confirmModalData) return;
        try {
            const res = await fetch(`/api/hr/expenses/${confirmModalData.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: confirmModalData.status }),
            });
            if (res.ok) {
                setConfirmModalData(null);
                mutate();
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (newStatus === 'PAID') {
            setConfirmModalData({ id, status: newStatus });
            return;
        }

        try {
            const res = await fetch(`/api/hr/expenses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                mutate();
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'APPROVED': return 'bg-green-100 text-green-800 border border-green-200';
            case 'REJECTED': return 'bg-red-100 text-red-800 border border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border border-yellow-200'; // PENDING
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <BanknotesIcon className="w-8 h-8 text-rose-500" />
                        ระบบจัดการเบิกจ่าย (Expense Approvals)
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">ตรวจสอบ อนุมัติ และบันทึกบัญชีรายการขอเบิกจ่ายจากพนักงาน</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">รายการคำขอเบิกจ่าย</h2>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-4"></div>
                        กำลังโหลดข้อมูล...
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">ไม่สามารถดึงข้อมูลได้</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-4 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">อัปเดตล่าสุด</th>
                                    <th className="px-6 py-4 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ผู้เบิก</th>
                                    <th className="px-6 py-4 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รายการ</th>
                                    <th className="px-6 py-4 bg-gray-50 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">ยอดเงิน</th>
                                    <th className="px-6 py-4 bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">หลักฐาน</th>
                                    <th className="px-6 py-4 bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-6 py-4 bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {expenses && expenses.length > 0 ? (
                                    expenses.map((expense: any) => (
                                        <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(expense.createdAt).toLocaleDateString('th-TH')}
                                                <div className="text-xs text-gray-400 mt-1">{new Date(expense.createdAt).toLocaleTimeString('th-TH')}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold shrink-0">
                                                        {expense.requestor?.user?.name?.[0] || "?"}
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-sm font-medium text-gray-900">{expense.requestor?.user?.name || "ไม่ระบุ"}</p>
                                                        <p className="text-xs text-gray-500">{expense.department?.name || "ไม่มีแผนก"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={expense.description}>
                                                <div className="font-semibold">{expense.title}</div>
                                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{expense.description || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                                {formatCurrency(expense.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                {expense.receiptUrl ? (
                                                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors">
                                                        <DocumentArrowDownIcon className="w-4 h-4" /> ดูสลิป
                                                    </a>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusStyle(expense.status)}`}>
                                                    {expense.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                {expense.status === 'PENDING' ? (
                                                    <div className="flex justify-center space-x-2">
                                                        <button onClick={() => handleStatusUpdate(expense.id, 'APPROVED')} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-900 rounded-lg transition-colors border border-green-200" title="อนุมัติเบื้องต้น">
                                                            <CheckCircleIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => handleStatusUpdate(expense.id, 'REJECTED')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-900 rounded-lg transition-colors border border-red-200" title="ไม่อนุมัติ">
                                                            <XCircleIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : expense.status === 'APPROVED' ? (
                                                    <div className="flex justify-center">
                                                        <button onClick={() => handleStatusUpdate(expense.id, 'PAID')} className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors shadow-sm text-xs font-bold w-full" title="ลงยอดจ่ายเงินแล้ว">
                                                            💵 มาร์คว่าจ่ายแล้ว
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 bg-gray-50/50">
                                            ยังไม่มีรายการเบิกจ่ายในระบบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <BanknotesIcon className="w-8 h-8" />
                            <h3 className="text-xl font-bold">ยืนยันการจ่ายเงิน?</h3>
                        </div>
                        <p className="text-gray-600 mb-6 font-medium">
                            การมาร์คว่า <span className="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">จ่ายแล้ว</span> จะทำให้ระบบทำการหักยอดเงินออกจาก<br />
                            <span className="font-bold border-b border-gray-300 pointer-events-none">สมุดบัญชีรายจ่าย (Cashflow Ledger)</span> โดยอัตโนมัติ
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModalData(null)}
                                className="px-4 py-2 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={executeStatusUpdate}
                                className="px-4 py-2 font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
                            >
                                💵 ยืนยันจ่ายเงิน
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
