"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckBadgeIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function ApprovalsPage() {
    const { data: pendingLogs, error, isLoading, mutate } = useSWR("/api/hr/attendance/approvals", fetcher);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === pendingLogs?.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingLogs?.map((log: any) => log.id) || []);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`ยืนยันการอนุมัติเวลาเข้า-ออกงาน ${selectedIds.length} รายการ?`)) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/hr/attendance/approvals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeLogIds: selectedIds }),
            });
            if (res.ok) {
                alert("✅ อนุมัติสำเร็จ! ข้อมูลถูกส่งไปให้พนักงานรีวิวต่อแล้ว");
                setSelectedIds([]);
                mutate();
            } else {
                alert("เกิดข้อผิดพลาดในการอนุมัติ");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return "-";
        return new Date(isoString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldCheckIcon className="w-8 h-8 text-indigo-600" />
                        Line Manager Approvals
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">ตรวจสอบและลงนามรับรองเวลาทำงานของพนักงานในความดูแล (Direct Subordinates)</p>
                </div>
                <button
                    onClick={handleBulkApprove}
                    disabled={selectedIds.length === 0 || isSubmitting}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    <CheckBadgeIcon className="w-5 h-5" />
                    Approve Selected ({selectedIds.length})
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">กำลังโหลดคำขอที่รอการอนุมัติ...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">ไม่สามารถดึงข้อมูลได้: {error.message}</div>
                ) : pendingLogs?.length === 0 ? (
                    <div className="text-center py-16">
                        <ShieldCheckIcon className="w-16 h-16 text-green-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-800">ไม่มีรายการรออนุมัติ</h3>
                        <p className="text-gray-500 text-sm">ลูกน้องทุกคนได้รับการอนุมัติเวลาเรียบร้อยแล้ว หรือไม่มีข้อมูลใหม่</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 bg-gray-50 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === pendingLogs?.length && pendingLogs?.length > 0}
                                            onChange={toggleAll}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">วันที่</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">พนักงาน</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">เวลาเข้า-ออกจริง</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-indigo-600 uppercase">เวลาจ่ายเงิน (Payable)</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">สถานะระบบ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pendingLogs?.map((log: any) => (
                                    <tr key={log.id} className={selectedIds.includes(log.id) ? "bg-indigo-50/30" : "hover:bg-gray-50"}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(log.id)}
                                                onChange={() => toggleSelection(log.id)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {new Date(log.date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="font-semibold text-gray-900">{log.employee?.user?.name || "Unknown"}</div>
                                            <div className="text-xs text-gray-500">{log.employee?.department?.name || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatTime(log.checkInTime)} - {formatTime(log.checkOutTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                                            {formatTime(log.payableCheckInTime)} - {formatTime(log.payableCheckOutTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800`}>
                                                รอหัวหน้าอนุมัติ
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
