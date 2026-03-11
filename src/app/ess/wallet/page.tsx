"use client";

import { useState } from "react";
import useSWR from "swr";
import { WalletIcon, BanknotesIcon, DocumentArrowDownIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

// Fetcher for ESS Wallet
const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred');
    return data;
};

export default function ESSWalletPage() {
    // We will need an API for /api/ess/wallet to fetch the employee's payrolls
    const { data: payrolls, error, isLoading } = useSWR("/api/ess/wallet", fetcher);
    const [selectedSlipId, setSelectedSlipId] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    };

    const formatMonth = (monthStr: string) => {
        if (!monthStr) return "";
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl shadow-lg border border-emerald-500/30 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <h1 className="text-2xl font-bold flex items-center gap-2 relative z-10">
                    <WalletIcon className="w-8 h-8 opacity-90" />
                    My Digital Wallet
                </h1>
                <p className="text-emerald-100 text-sm mt-1 relative z-10">
                    กระเป๋าเงินดิจิทัล แสดงประวัติสลิปเงินเดือนของคุณที่ได้รับการอนุมัติจากบริษัท (e-Payslip)
                </p>
                
                {payrolls && payrolls.length > 0 && (
                    <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 relative z-10">
                        <div className="text-emerald-50 text-xs uppercase tracking-wider font-semibold mb-1">
                            เงินเดือนสุทธิเดือนล่าสุด ({formatMonth(payrolls[0].month)})
                        </div>
                        <div className="text-4xl font-extrabold tracking-tight">
                            {formatCurrency(payrolls[0].netSalary)}
                        </div>
                        <div className="flex gap-4 mt-3 text-sm font-medium">
                            <span className="text-emerald-100/80">เงินเดือน: {formatCurrency(payrolls[0].baseSalary)}</span>
                            <span className="text-emerald-100/80">OT: +{formatCurrency(payrolls[0].otAmount)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <h3 className="text-lg font-bold text-gray-900 p-6 border-b border-gray-100 flex items-center gap-2">
                    <BanknotesIcon className="w-5 h-5 text-gray-400" />
                    ประวัติสลิปเงินเดือน (Payslip History)
                </h3>
                
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">กำลังดึงข้อมูลจากฝ่ายการเงิน...</div>
                ) : error ? (
                    <div className="p-10 text-center text-red-500">Error: {error.message}</div>
                ) : !payrolls || payrolls.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                        <DocumentArrowDownIcon className="w-12 h-12 text-gray-200 mb-3" />
                        ยังไม่มีประวัติสลิปเงินเดือนในระบบ
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {payrolls.map((slip: any) => (
                            <div key={slip.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl">
                                            <CalendarDaysIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg">{formatMonth(slip.month)}</h4>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${slip.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : slip.status === 'UNPAID' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {slip.status === 'PAID' ? 'จ่ายแล้ว (Paid)' : slip.status === 'UNPAID' ? 'รอรอบโอนเงิน (Pending)' : slip.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-extrabold text-emerald-600">{formatCurrency(slip.netSalary)}</div>
                                        <button 
                                            onClick={() => setSelectedSlipId(selectedSlipId === slip.id ? null : slip.id)}
                                            className="text-xs text-indigo-600 font-semibold hover:underline mt-1"
                                        >
                                            {selectedSlipId === slip.id ? 'ซ่อนรายละเอียด' : 'ดูรายรับ-รายจ่าย'}
                                        </button>
                                    </div>
                                </div>

                                {selectedSlipId === slip.id && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 grid grid-cols-2 gap-x-8 gap-y-4 text-sm animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <h5 className="font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg mb-2">รายได้ (Earnings)</h5>
                                            <div className="space-y-2 px-1">
                                                <div className="flex justify-between text-gray-600"><span>เงินเดือนพื้นฐาน</span> <span>{formatCurrency(slip.baseSalary)}</span></div>
                                                <div className="flex justify-between text-gray-600"><span>ค่าล่วงเวลา (OT)</span> <span className="text-emerald-600">+{formatCurrency(slip.otAmount)}</span></div>
                                                <div className="flex justify-between text-gray-600"><span>โบนัส/เบี้ยขยัน</span> <span className="text-emerald-600">+{formatCurrency(slip.bonus)}</span></div>
                                                <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-2 font-semibold font-bold">
                                                    <span>รวมรายได้</span> 
                                                    <span>{formatCurrency(slip.baseSalary + slip.otAmount + slip.bonus)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-red-800 bg-red-50 px-3 py-1 rounded-lg mb-2">รายการหัก (Deductions)</h5>
                                            <div className="space-y-2 px-1">
                                                <div className="flex justify-between text-gray-600"><span>ประกันสังคม (SSO)</span> <span className="text-red-500">-{formatCurrency(slip.socialSecurityDeduction)}</span></div>
                                                <div className="flex justify-between text-gray-600"><span>หักมาสาย/หยุด/ขาด</span> <span className="text-red-500">-{formatCurrency(slip.lateDeduction)}</span></div>
                                                <div className="flex justify-between text-gray-600"><span>หัก ณ ที่จ่าย (Tax)</span> <span className="text-red-500">-{formatCurrency(slip.taxDeduction)}</span></div>
                                                <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-2 font-semibold font-bold">
                                                    <span>รวมรายการหัก</span> 
                                                    <span>{formatCurrency(slip.socialSecurityDeduction + slip.lateDeduction + slip.taxDeduction)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
