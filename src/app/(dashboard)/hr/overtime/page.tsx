"use client";

import { useState } from "react";
import useSWR from "swr";
import { PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function OvertimePage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create overtime form
    const [employeeId, setEmployeeId] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("18:00");
    const [endTime, setEndTime] = useState("20:00");
    const [calculatedHours, setCalculatedHours] = useState(2);
    const [multiplier, setMultiplier] = useState("1.5");
    const [reason, setReason] = useState("");

    const { data: requests, error, isLoading, mutate } = useSWR("/api/hr/overtime", fetcher);
    const { data: employees } = useSWR("/api/hr/employees", fetcher); // fetch employees for dropdown

    const handleCreateOT = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/hr/overtime", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employeeId, date, startTime, endTime, calculatedHours, multiplier, reason }),
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                mutate();
            } else {
                alert("Failed to create OT request");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/hr/overtime/${id}`, {
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

    const handleDelete = async (id: string) => {
        if (!confirm("ต้องการลบรายการโอทีนี้ใช่หรือไม่?")) return;
        try {
            const res = await fetch(`/api/hr/overtime/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                mutate();
            } else {
                alert("Failed to delete request");
            }
        } catch (error) {
            console.error(error);
        }
    }

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
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <span>⏰</span> ศูนย์จัดการล่วงเวลา (Overtime Inbox)
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">ตรวจสอบและอนุมัติการทำงานล่วงเวลา (OT) ของพนักงาน</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow hover:bg-indigo-700 transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    เพิ่มโอทีพนักงาน
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">ประวัติและคำขอ OT ล่าสุด</h2>

                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">กำลังโหลดคำขอ...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">ไม่สามารถดึงข้อมูลได้</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">วันเวลาทำ OT</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">พนักงาน</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">เนื้อหางาน</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {requests && requests.length > 0 ? (
                                    requests.map((req: any) => (
                                        <tr key={req.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="font-semibold">{new Date(req.date).toLocaleDateString('th-TH')}</div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" /> {req.startTime} - {req.endTime}
                                                    <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-1">
                                                        ({req.calculatedHours} ชม. x {req.multiplier})
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="font-medium text-gray-900">{req.employee?.user?.name || "ไม่ระบุ"}</div>
                                                <div className="text-xs text-gray-500">{req.employee?.department?.name || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[250px] truncate" title={req.reason}>
                                                {req.reason || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(req.status)}`}>
                                                    {req.status === 'PENDING' ? 'รออนุมัติ' : req.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {req.status === 'PENDING' ? (
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => handleStatusUpdate(req.id, 'APPROVED')} className="text-green-600 hover:text-green-900" title="อนุมัติ">
                                                            <CheckCircleIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => handleStatusUpdate(req.id, 'REJECTED')} className="text-red-600 hover:text-red-900" title="ปฏิเสธ">
                                                            <XCircleIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex space-x-2">
                                                        <span className="text-gray-400">สรุปผลแล้ว</span>
                                                        <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:text-red-900 ml-4 font-normal text-xs underline">ลบ</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                                            ยังไม่มีคำขอการทำล่วงเวลา
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create OT Modal (HR Admin Override) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">เพิ่มโอทีให้พนักงานอัตโนมัติ (Auto-Approve)</h3>
                        <form onSubmit={handleCreateOT} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">พนักงานเป้าหมาย</label>
                                <select
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 border"
                                    required
                                >
                                    <option value="" disabled>เลือกพนักงาน...</option>
                                    {employees?.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>{emp.user?.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ทำ OT</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 border"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 border"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">อัตราคูณ (x)</label>
                                    <select
                                        value={multiplier}
                                        onChange={(e) => setMultiplier(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 border"
                                        required
                                    >
                                        <option value="1.0">1.0x (วันทำงาน)</option>
                                        <option value="1.5">1.5x (ล่วงหน้า)</option>
                                        <option value="3.0">3.0x (วันหยุด)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชม. คำนวณ</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={calculatedHours}
                                        onChange={(e) => setCalculatedHours(parseFloat(e.target.value))}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 border"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผลรับรอง</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 border"
                                    rows={2}
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
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow"
                                >
                                    เพิ่มโอที
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
