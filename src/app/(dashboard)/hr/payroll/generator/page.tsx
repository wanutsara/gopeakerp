"use client";

import { useState } from "react";
import useSWR from "swr";
import { BanknotesIcon, CalendarDaysIcon, PlayCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// Fetcher for the upcoming API
const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred');
    return data;
};

export default function PayrollGeneratorPage() {
    const today = new Date();
    // Default to last month
    const [targetMonth, setTargetMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() === 0 ? 12 : today.getMonth()).padStart(2, '0')}`);
    
    // We will build this API next
    const { data: previewData, error, isLoading, mutate } = useSWR(`/api/hr/payroll/generate?month=${targetMonth}`, fetcher);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleRunPayroll = async () => {
        if (!confirm(`ยืนยันการรัน Payroll ประจำเดือน ${targetMonth} ? ข้อมูลจะถูกบันทึกลงระบบการเงินทันที`)) return;

        setIsGenerating(true);
        try {
            const res = await fetch(`/api/hr/payroll/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month: targetMonth })
            });
            if (res.ok) {
                alert("✅ รันข้อมูลการจ่ายเงินเดือนสำเร็จ! ออกใบ Payslip เรียบร้อยแล้ว");
                mutate();
            } else {
                const data = await res.json();
                alert(`เกิดข้อผิดพลาด: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <BanknotesIcon className="w-8 h-8 text-emerald-600" />
                        The Payroll Singularity
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">ทดสอบและตีกรอบการจ่ายเงินเดือนอัตโนมัติประจำรอบเดือน (Auto-Generation Matrix)</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                        <CalendarDaysIcon className="w-5 h-5 text-gray-500" />
                        <input
                            type="month"
                            value={targetMonth}
                            onChange={(e) => setTargetMonth(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-gray-800"
                        />
                    </div>
                    
                    <button
                        onClick={handleRunPayroll}
                        disabled={isGenerating || previewData?.hasBlockers || !previewData?.employees?.length}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow hover:bg-emerald-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <PlayCircleIcon className="w-5 h-5" />
                        {isGenerating ? "กำลังประมวลผล..." : "Run Payroll Batch"}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">ตารางพรีวิวเงินเดือน (Pre-computation Audit)</h3>
                
                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">กำลังเชื่อมต่อฐานข้อมูล...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">ไม่สามารถเชื่อมต่อระบบประมวลผลได้: {error.message}</div>
                ) : (
                    <>
                        {previewData?.hasBlockers && (
                            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex gap-3">
                                <ExclamationTriangleIcon className="w-6 h-6 text-red-500 shrink-0" />
                                <div>
                                    <h4 className="text-red-800 font-bold">⚠️ พบปัญหา (Safety Lock Engaged)</h4>
                                    <p className="text-red-700 text-sm mt-1">
                                        มีพนักงานประทับเวลาไม่สมบูรณ์ หัวหน้ายังไม่อนุมัติ หรือพนักงานเปิด Dispute ค้างไว้ <br/>
                                        ระบบไม่อนุญาตให้รัน Payroll จนกว่า TimeLogs จะเคลียร์สถานะทั้งหมด กรุณาตรวจสอบรายชื่อที่มีแถบสีแดง
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {!previewData?.employees || previewData.employees.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">ไม่มีข้อมูลพนักงาน หรือรันของเดือนนี้ไปแล้ว</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">พนักงาน</th>
                                            <th className="px-4 py-3 bg-gray-50 text-right text-xs font-semibold text-gray-500 uppercase">เงินเดือนฐาน</th>
                                            <th className="px-4 py-3 bg-gray-50 text-right text-xs font-semibold text-gray-500 uppercase">ค่าล่วงเวลา (OT)</th>
                                            <th className="px-4 py-3 bg-gray-50 text-right text-xs font-semibold text-red-500 uppercase">หักสาย/ขาด</th>
                                            <th className="px-4 py-3 bg-gray-50 text-right text-xs font-semibold text-red-500 uppercase">ประกันสังคม (-5%)</th>
                                            <th className="px-4 py-3 bg-gray-50 text-right text-xs font-semibold text-emerald-600 uppercase">รายรับสุทธิ (Net)</th>
                                            <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">สถานะใบตรวจเวลา</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {previewData.employees.map((emp: any) => (
                                            <tr key={emp.id} className={emp.isBlocked ? "bg-red-50/50" : "hover:bg-gray-50"}>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {emp.name} <span className="text-gray-500 text-xs font-normal ml-1">({emp.department})</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-600">{formatCurrency(emp.baseSalary)}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-blue-600">+{formatCurrency(emp.otAmount)}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-600">-{formatCurrency(emp.lateDeduction)}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-600">-{formatCurrency(emp.ssoDeduction)}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-emerald-600">{formatCurrency(emp.netSalary)}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-xs">
                                                    {emp.isBlocked ? (
                                                        <span className="text-red-600 font-bold bg-red-100 px-2.5 py-1 rounded-full">{emp.blockReason}</span>
                                                    ) : (
                                                        <span className="text-emerald-600 font-bold bg-emerald-100 px-2.5 py-1 rounded-full">เคลียร์ (พร้อมจ่าย)</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold">
                                        <tr>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">รวมทั้งหมด (Total)</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(previewData.totals.baseSalary)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-blue-600">+{formatCurrency(previewData.totals.otAmount)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-600">-{formatCurrency(previewData.totals.lateDeduction)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-600">-{formatCurrency(previewData.totals.ssoDeduction)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-emerald-600">{formatCurrency(previewData.totals.netSalary)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
