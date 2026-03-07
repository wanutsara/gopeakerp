"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, TrendingUp, PiggyBank, ArrowDownToLine,
    ChevronLeft, ChevronRight, ShieldCheck, Download,
    FileText, Zap, Award
} from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function FinancialVault() {
    const { data, error, isLoading } = useSWR('/api/ess/payroll', fetcher);
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !data || !data.payrolls) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-center">
                <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-700">
                    <Wallet className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">ไม่พบข้อมูลบัญชีเงินเดือน</h2>
                    <p className="text-slate-400 text-sm">ยังไม่มีประวัติการจ่ายเงินเดือน หรือบัญชีของคุณกำลังถูกประมวลผล</p>
                </div>
            </div>
        );
    }

    const { employee, payrolls, ytd } = data;
    const currentSlip = payrolls[selectedMonthIndex];

    // Formatting utils
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            // Initiate Native Print/Save-as-PDF Dialogue via new tab
            window.open(`/api/ess/payslip/pdf?payrollId=${currentSlip.id}`, '_blank');
        } catch (error) {
            console.error(error);
            alert("ไม่สามารถดาวน์โหลด PDF ได้ในขณะนี้ โปรดติดต่อ HR");
        } finally {
            // Slight delay before removing spinner to feel solid
            setTimeout(() => setIsDownloading(false), 800);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-200 pb-24 md:pb-8 selection:bg-emerald-500/30">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[150px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full mix-blend-screen"></div>
            </div>

            <div className="relative z-10 max-w-lg mx-auto p-6 pt-10 space-y-8">

                {/* Header Profile Section */}
                <div className="flex justify-between items-center bg-slate-800/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 p-0.5">
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-lg">
                                    {employee.name.charAt(0)}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded-md text-[10px] font-black text-emerald-400 flex items-center gap-0.5">
                                <Award className="w-3 h-3" /> LV.{employee.level}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-tight">{employee.name}</h1>
                            <p className="text-xs text-slate-400">{employee.brand?.name || 'Central Organization'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Quest Coins</p>
                        <p className="text-lg font-black text-white flex items-center justify-end gap-1">
                            <span className="text-yellow-400">🪙</span> {employee.currentExp || 0}
                        </p>
                    </div>
                </div>

                {payrolls.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-slate-400">ยังไม่มีสลิปเงินเดือนในระบบ</p>
                    </div>
                ) : (
                    <>
                        {/* Month Selector */}
                        <div className="flex items-center justify-between px-2">
                            <button
                                onClick={() => setSelectedMonthIndex(prev => Math.min(payrolls.length - 1, prev + 1))}
                                disabled={selectedMonthIndex === payrolls.length - 1}
                                className="p-2 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <div className="text-center flex-1">
                                <motion.h2
                                    key={currentSlip.month}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-2xl font-black text-white px-4 py-1.5 bg-slate-800/80 rounded-2xl border border-slate-700 inline-block"
                                >
                                    {new Date(currentSlip.month + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                </motion.h2>
                                {selectedMonthIndex === 0 && <p className="text-[10px] text-emerald-400 mt-2 font-bold tracking-widest uppercase">ล่าสุด (Latest)</p>}
                            </div>
                            <button
                                onClick={() => setSelectedMonthIndex(prev => Math.max(0, prev - 1))}
                                disabled={selectedMonthIndex === 0}
                                className="p-2 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Interactive 3D Payslip Card */}
                        <div className="perspective-1000 relative w-full aspect-[1/1.6] sm:aspect-[1.586/1] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                            <motion.div
                                className="w-full h-full relative preserve-3d transition-all duration-500 ease-in-out"
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            >
                                {/* FRONT of Card: High-level Net Salary */}
                                <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] border border-slate-700/50 shadow-2xl p-6 flex flex-col justify-between overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -z-10"></div>

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">รายรับสุทธิ (Net Pay)</p>
                                            <div className="flex items-end gap-1">
                                                <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                                                    {formatCurrency(currentSlip.netSalary).replace('฿', '')}
                                                </span>
                                                <span className="text-emerald-500 font-bold mb-1 sm:mb-2">THB</span>
                                            </div>
                                        </div>
                                        <div className="w-12 h-8 rounded-md border border-slate-700 bg-slate-800/50 flex items-center justify-center">
                                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500" style={{ width: `${(currentSlip.baseSalary / (currentSlip.baseSalary + currentSlip.bonus + currentSlip.otAmount)) * 100}%` }}></div>
                                            <div className="h-full bg-blue-500" style={{ width: `${((currentSlip.bonus + currentSlip.otAmount) / (currentSlip.baseSalary + currentSlip.bonus + currentSlip.otAmount)) * 100}%` }}></div>
                                        </div>

                                        <div className="flex justify-between text-xs font-semibold">
                                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> ฐานเงินเดือน</div>
                                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> เงินพิเศษ / ล่วงเวลา</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end border-t border-slate-700 pt-4 mt-6">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Issued By</p>
                                            <p className="text-sm font-semibold text-slate-300">{employee.brand?.legalName || 'HQ Payroll Operations'}</p>
                                        </div>
                                        <div className="text-right">
                                            <motion.div
                                                animate={{ scale: [1, 1.05, 1] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full font-bold uppercase tracking-widest"
                                            >
                                                <Zap className="w-3 h-3" /> แตะเพื่อดูรายละเอียด
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>

                                {/* BACK of Card: Detailed Breakdown */}
                                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-900 rounded-[2rem] border border-slate-700 p-6 flex flex-col justify-between overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[80px] -z-10"></div>

                                    <div>
                                        <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 mb-4">ตารางแจกแจงฉบับย่อ (Summary)</h3>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">เงินเดือน (Base Salary)</span>
                                                <span className="font-semibold text-white">{formatCurrency(currentSlip.baseSalary)}</span>
                                            </div>
                                            {(currentSlip.otAmount > 0 || currentSlip.bonus > 0 || currentSlip.otherIncome > 0) && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">ล่วงเวลา & โบนัส (Variabilities)</span>
                                                    <span className="font-semibold text-emerald-400">{formatCurrency(currentSlip.otAmount + currentSlip.bonus + currentSlip.otherIncome)}</span>
                                                </div>
                                            )}
                                            {currentSlip.taxDeduction > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">หักภาษี ณ ที่จ่าย (Tax)</span>
                                                    <span className="font-semibold text-red-400">-{formatCurrency(currentSlip.taxDeduction)}</span>
                                                </div>
                                            )}
                                            {currentSlip.socialSecurityDeduction > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">หักประกันสังคม (SSO)</span>
                                                    <span className="font-semibold text-red-400">-{formatCurrency(currentSlip.socialSecurityDeduction)}</span>
                                                </div>
                                            )}
                                            {(currentSlip.deductions > 0 || currentSlip.lateDeduction > 0) && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">หักขาด/สาย (Deductions)</span>
                                                    <span className="font-semibold text-red-400">-{formatCurrency(currentSlip.deductions + currentSlip.lateDeduction)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center mt-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">รับสุทธิ (Net)</span>
                                        <span className="text-lg font-black text-emerald-400">{formatCurrency(currentSlip.netSalary)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Download Official PDF Button */}
                        <motion.button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-2xl p-4 flex items-center justify-between text-white transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold">เอกสารทางการ (Official PDF)</h3>
                                    <p className="text-xs text-slate-400">ดาวน์โหลดเพื่อใช้ยื่นกู้ธนาคาร หรือทำธุรกรรม</p>
                                </div>
                            </div>
                            <div className="text-slate-400">
                                {isDownloading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Download className="w-5 h-5" />
                                )}
                            </div>
                        </motion.button>

                        {/* YTD Analysis Widget */}
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-400" /> สถิติสะสมปี {ytd.year} (YTD)
                            </h3>

                            <div className="space-y-5">
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-sm text-slate-400">รายรับทั้งหมด (Gross YTD)</span>
                                        <span className="font-bold text-emerald-400">{formatCurrency(ytd.gross)}</span>
                                    </div>
                                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-full"></div>
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-sm text-slate-400">จ่ายภาษีสะสม ภ.ง.ด.1 (Tax YTD)</span>
                                        <span className="font-bold text-rose-400">{formatCurrency(ytd.tax)}</span>
                                    </div>
                                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-rose-500 h-full w-full"></div>
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-sm text-slate-400">สมทบประกันสังคมสะสม (SSO YTD)</span>
                                        <span className="font-bold text-blue-400">{formatCurrency(ytd.sso)}</span>
                                    </div>
                                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full w-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 3D Environment Styles */}
            <style jsx global>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                
                /* Custom scrollbar for stealth look */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
}
