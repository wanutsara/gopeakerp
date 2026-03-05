"use client";

import { useState } from "react";
import useSWR from "swr";
import { PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

// Fetcher for SWR
const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function LeavePage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // For creating new leave
    const [type, setType] = useState("PERSONAL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("18:00");
    const [requestedHours, setRequestedHours] = useState(8);
    const [reason, setReason] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    const { data: leaves, error, isLoading, mutate } = useSWR("/api/hr/leave", fetcher);

    // Create Leave
    const handleCreateLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let uploadedUrl = attachmentUrl;

            if (type === 'SICK' && attachmentFile) {
                const formData = new FormData();
                formData.append("file", attachmentFile);
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                });
                if (!uploadRes.ok) throw new Error("อัพโหลดไฟล์ใบรับรองแพทย์ไม่สำเร็จ");
                const uploadData = await uploadRes.json();
                uploadedUrl = uploadData.url;
            } else if (type === 'SICK' && !attachmentFile) {
                alert("กรุณาแนบใบรับรองแพทย์");
                return;
            }

            const res = await fetch("/api/hr/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, startDate, endDate, startTime, endTime, requestedHours, reason, attachmentUrl: type === 'SICK' ? uploadedUrl : undefined }),
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                setAttachmentFile(null);
                setAttachmentUrl("");
                mutate(); // Refresh leaves list
            } else {
                alert("Failed to create leave request");
            }
        } catch (error: any) {
            alert(error.message || "เกิดข้อผิดพลาด");
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
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">เอกสารแนบ</th>
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
                                                <div className="font-semibold">{new Date(leave.startDate).toLocaleDateString('th-TH')} - {new Date(leave.endDate).toLocaleDateString('th-TH')}</div>
                                                {leave.requestedHours ? (
                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <ClockIcon className="w-3 h-3" /> {leave.startTime} - {leave.endTime} <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1">({leave.requestedHours} ชม.)</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <ClockIcon className="w-3 h-3" /> ลาเต็มวัน
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {leave.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {leave.reason || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">
                                                {leave.attachmentUrl ? (
                                                    <a href={leave.attachmentUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                                                        📄 ใบรับรองแพทย์
                                                    </a>
                                                ) : "-"}
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
                                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชม. ขอลา</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={requestedHours}
                                    onChange={(e) => setRequestedHours(parseFloat(e.target.value))}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                    required
                                />
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
                            {type === 'SICK' && (
                                <div className="animate-in fade-in zoom-in duration-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">แนบใบรับรองแพทย์ <span className="text-red-500">*</span></label>
                                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            required
                                            accept="image/*,application/pdf"
                                            onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {attachmentFile ? (
                                            <div className="text-sm font-medium text-blue-600 flex flex-col items-center gap-1">
                                                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {attachmentFile.name}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 flex flex-col items-center gap-1">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                คลิกเพื่อเลือกไฟล์เอกสาร (ภาพ/PDF)
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">กรณีลาป่วยเกิน 3 วัน จำเป็นต้องแนบใบรับรองแพทย์</p>
                                </div>
                            )}
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
