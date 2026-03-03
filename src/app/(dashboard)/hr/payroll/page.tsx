"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PayrollPage() {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

    // Modal states
    const [editingPayroll, setEditingPayroll] = useState<any>(null);
    const [editForm, setEditForm] = useState({ otherIncome: 0, bonus: 0, deductions: 0 });

    const { data: payrolls, error, isLoading, mutate } = useSWR(`/api/hr/payroll?month=${selectedMonth}`, fetcher);

    const handleGeneratePayroll = async () => {
        try {
            const res = await fetch("/api/hr/payroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month: selectedMonth }),
            });
            if (res.ok) {
                mutate();
                alert("สรุปเงินเดือนสำเร็จ!");
            } else {
                const data = await res.json();
                alert(`เกิดข้อผิดพลาด: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleTogglePayment = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/hr/payroll/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                mutate();
            } else {
                alert("ไม่สามารถอัปเดตสถานะได้");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenEdit = (payroll: any) => {
        setEditingPayroll(payroll);
        setEditForm({
            otherIncome: payroll.otherIncome || 0,
            bonus: payroll.bonus || 0,
            deductions: payroll.deductions || 0
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayroll) return;
        try {
            const res = await fetch(`/api/hr/payroll/${editingPayroll.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    otherIncome: Number(editForm.otherIncome),
                    bonus: Number(editForm.bonus),
                    deductions: Number(editForm.deductions)
                })
            });
            if (res.ok) {
                setEditingPayroll(null);
                mutate();
            } else {
                alert("บันทึกไม่สำเร็จ");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const unpaidCount = payrolls?.filter((p: any) => p.status === "UNPAID").length || 0;
    const paidCount = payrolls?.filter((p: any) => p.status === "PAID").length || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ระบบเงินเดือน (Payroll)</h1>
                    <p className="mt-1 text-sm text-gray-500">จัดการเงินเดือน สร้าง Slip และตรวจสอบประวัติการจ่ายเงิน</p>
                </div>
                <div className="flex gap-4">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                        onClick={handleGeneratePayroll}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow hover:bg-blue-700 transition"
                    >
                        สรุปเงินเดือนเดือนนี้
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-500 mb-1">ยอดจัดสร้างสำหรับเดือน</p>
                    <div className="text-3xl font-bold text-gray-900">{payrolls?.length || 0} <span className="text-base font-normal text-gray-500">รายการ</span></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-500 mb-1">รอการจ่าย (Unpaid)</p>
                    <div className="text-3xl font-bold text-gray-900">{unpaidCount} <span className="text-base font-normal text-gray-500">รายการ</span></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-500 mb-1">จ่ายแล้ว (Paid)</p>
                    <div className="text-3xl font-bold text-green-600">{paidCount} <span className="text-base font-normal text-gray-500">รายการ</span></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">ตารางสรุปเงินเดือน ({selectedMonth})</h2>

                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">ไม่สามารถดึงข้อมูลได้</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">พนักงาน</th>
                                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">ฐานเงินเดือน</th>
                                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">รายได้อื่นๆ / โบนัส / OT</th>
                                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">รายการหัก</th>
                                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">รับสุทธิ</th>
                                    <th className="px-6 py-3 bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะการจ่าย</th>
                                    <th className="px-6 py-3 bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {payrolls && payrolls.length > 0 ? (
                                    payrolls.map((payroll: any) => (
                                        <tr key={payroll.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{payroll.employee?.user?.name || "ไม่ระบุ"}</div>
                                                        <div className="text-sm text-gray-500">{payroll.employee?.position || "-"}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">฿{payroll.baseSalary.toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm flex flex-col items-end">
                                                <span className="text-green-600 font-medium">+฿{(payroll.otAmount + payroll.bonus + (payroll.otherIncome || 0)).toLocaleString()}</span>
                                                <button onClick={() => handleOpenEdit(payroll)} className="text-xs text-blue-500 hover:underline mt-1">แก้ไขรายได้/หัก</button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-right">-฿{payroll.deductions.toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">฿{payroll.netSalary.toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payroll.status === "PAID" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                                    {payroll.status === "PAID" ? "จ่ายแล้ว" : "รอการจ่าย"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                                {payroll.status === "UNPAID" ? (
                                                    <button onClick={() => handleTogglePayment(payroll.id, "PAID")} className="text-green-600 hover:text-green-900 font-semibold border border-green-600 px-3 py-1 rounded-lg hover:bg-green-50">
                                                        ยืนยันการจ่าย
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleTogglePayment(payroll.id, "UNPAID")} className="text-red-500 hover:text-red-700 text-xs mt-1 underline">
                                                        ยกเลิกสถานะ
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                                            ยังไม่มีรายการเงินเดือนในเดือนนี้. กรุณากด "สรุปเงินเดือนเดือนนี้".
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Payroll Modal */}
            {editingPayroll && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setEditingPayroll(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">แก้ไขรายการได้/หัก</h3>
                        <p className="text-sm text-gray-500 mb-6">พนักงาน: {editingPayroll.employee?.user?.name}</p>
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายได้อื่นๆ (Other Incomes)</label>
                                <input
                                    type="number"
                                    value={editForm.otherIncome}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, otherIncome: Number(e.target.value) }))}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">โบนัส / OT ส่วนเพิ่ม</label>
                                <input
                                    type="number"
                                    value={editForm.bonus}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, bonus: Number(e.target.value) }))}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายการหัก (Deductions)</label>
                                <input
                                    type="number"
                                    value={editForm.deductions}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, deductions: Number(e.target.value) }))}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingPayroll(null)}
                                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow"
                                >
                                    บันทึกการแก้ไข
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
