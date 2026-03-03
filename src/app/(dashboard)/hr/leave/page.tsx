"use client";

import { useState } from "react";
import useSWR from "swr";
import { PlusIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LeavePage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // For creating new leave
    const [type, setType] = useState("PERSONAL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");

    const { data: leaves, error, isLoading, mutate } = useSWR("/api/hr/leave", fetcher);

    // Create Leave
    const handleCreateLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/hr/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, startDate, endDate, reason }),
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                mutate(); // Refresh leaves list
            } else {
                alert("Failed to create leave request");
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Handle Approve / Reject
    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/hr/leave/${id}`, {
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
            case 'APPROVED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800'; // PENDING
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ระบบวันลาและการเข้างาน (Leave & Attendance)</h1>
                    <p className="mt-1 text-sm text-gray-500">ติดตามเวลาเข้า-ออกงาน และจัดการวันหยุดพนักงาน</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow hover:bg-blue-700 transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    สร้างคำขอลาใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">ประวัติคำขอลา (Leave Requests)</h2>

                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">ไม่สามารถดึงข้อมูลได้</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">วันเวลาที่ลางาน</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ประเภท</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">เนื้อหา/เหตุผล</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">พนักงาน</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {leaves && leaves.length > 0 ? (
                                    leaves.map((leave: any) => (
                                        <tr key={leave.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {leave.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {leave.reason || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {leave.employee?.user?.name || "ไม่ระบุ"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(leave.status)}`}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {leave.status === 'PENDING' ? (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave.id, 'APPROVED')}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="อนุมัติ"
                                                        >
                                                            <CheckCircleIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave.id, 'REJECTED')}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="ปฏิเสธ"
                                                        >
                                                            <XCircleIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">อัปเดตแล้ว</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                                            ยังไม่มีคำขอลาในระบบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Leave Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">สร้างคำขอลาใหม่</h3>
                        <form onSubmit={handleCreateLeave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทการลา</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                    required
                                >
                                    <option value="PERSONAL">ลากิจ (Personal)</option>
                                    <option value="SICK">ลาป่วย (Sick)</option>
                                    <option value="VACATION">ลาพักร้อน (Vacation)</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผลการลา</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                    rows={3}
                                    placeholder="ระบุเหตุผล..."
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow"
                                >
                                    ยืนยันคำขอ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
