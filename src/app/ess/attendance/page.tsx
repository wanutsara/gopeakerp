"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred');
    return data;
};

export default function ESSAttendancePage() {
    const { data: logs, error, isLoading, mutate } = useSWR("/api/ess/attendance", fetcher);
    
    const [disputeModalOpen, setDisputeModalOpen] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState("");
    const [disputeReason, setDisputeReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAccept = async (id: string) => {
        if (!confirm("ยืนยันรายได้ตามเวลาที่ระบุย้อนหลัง? (Accept Payable Time)")) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/ess/attendance", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeLogId: id, action: "ACCEPT" })
            });
            if (res.ok) {
                alert("บันทึกการยอมรับเรียบร้อยแล้ว");
                mutate();
            } else {
                alert("Failed to accept");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDisputeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/ess/attendance", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeLogId: selectedLogId, action: "DISPUTE", disputeReason })
            });
            if (res.ok) {
                alert("ระบบได้ส่งคำคัดค้านชั่วโมงการทำงานให้ HR และหัวหน้าแผนกแล้ว");
                setDisputeModalOpen(false);
                setDisputeReason("");
                mutate();
            } else {
                alert("Failed to submit dispute");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return "-";
        return new Date(isoString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ClockIcon className="w-7 h-7 text-indigo-600" />
                    ประวัติเวลาทำงานของฉัน
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    ตรวจสอบเวลาเข้าออกที่ได้รับการคำนวณเงินแล้ว หากพบว่าเวลาไม่ถูกต้อง (เช่น ลืมสแกนออก หรือ ทำ OT แต่ระบบตัด) สามารถกดแจ้งเตือน (Dispute) ได้
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">กำลังโหลด...</div>
                ) : error ? (
                    <div className="p-10 text-center text-red-500">Error: {error.message}</div>
                ) : logs?.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">ไม่พบประวัติการทำงานของคุณ</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">วันที่</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">การเข้า-ออกจริง</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-600 uppercase">เวลาที่นำไปจ่ายเงิน (สิ้นสุด)</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">สถานะใบตรวจ</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">การยืนยัน (PDPA)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs?.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {new Date(log.date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatTime(log.checkInTime)} - {formatTime(log.checkOutTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 bg-indigo-50/10">
                                            {formatTime(log.payableCheckInTime)} - {formatTime(log.payableCheckOutTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.isDisputed ? (
                                                <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                    มีข้อโต้แย้ง (Disputed)
                                                </span>
                                            ) : log.isApproved ? (
                                                <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    Manager อนุมัติแล้ว
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    รอหัวหน้าตรวจสอบ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {!log.isDisputed && log.isApproved ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleAccept(log.id)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg border border-green-200 transition"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" /> ยอมรับ
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedLogId(log.id);
                                                            setDisputeModalOpen(true);
                                                        }}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition"
                                                    >
                                                        <ExclamationTriangleIcon className="w-4 h-4" /> คัดค้าน
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Dispute Modal */}
            {disputeModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                            ยื่นคัดค้านเวลาจ่ายเงิน
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            โปรดระบุสาเหตุว่าทำไมเวลาเข้า-ออกงานของคุณถึงไม่ถูกต้อง (เช่น "เลิกงาน 20:30 น. แต่ระบบประทับ 18:00 น. เพราะลืมยื่นใบ OT")
                        </p>
                        
                        <form onSubmit={handleDisputeSubmit} className="space-y-4">
                            <div>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="พิมพ์เหตุผลอธิบาย HR ทราบ..."
                                    className="w-full border-gray-300 rounded-xl shadow-sm focus:ring-red-500 focus:border-red-500 p-3 border"
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDisputeModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow transition disabled:bg-red-400"
                                >
                                    ส่งใบแจ้ง Dispute
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
