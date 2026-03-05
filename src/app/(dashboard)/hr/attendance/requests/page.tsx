"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircleIcon, XCircleIcon, ClockIcon, InboxIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function RequestsInboxPage() {
    const [filterStatus, setFilterStatus] = useState<string>('PENDING');
    const { data, error, isLoading, mutate } = useSWR(`/api/hr/attendance/requests${filterStatus ? `?status=${filterStatus}` : ''}`, fetcher);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [comment, setComment] = useState<Record<string, string>>({});

    const handleAction = async (id: string, action: "APPROVED" | "REJECTED") => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/hr/attendance/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action, adminComment: comment[id] || "" })
            });

            if (!res.ok) throw new Error("Failed to process request");

            alert(`คำร้องถูก ${action === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'} เรียบร้อยแล้ว`);
            mutate();
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการทำรายการ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCommentChange = (id: string, val: string) => {
        setComment(prev => ({ ...prev, [id]: val }));
    };

    if (error) return <div className="p-6 text-red-500">Error loading requests</div>;

    const requests = data?.requests || [];

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 border-b-4 border-blue-500 pb-1 inline-block">
                        <InboxIcon className="w-6 h-6 text-blue-600" />
                        กล่องคำขอปรับเวลา (Request Inbox)
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">อนุมัติ หรือ ปฏิเสธ คำร้องขอแก้ไขเวลาเข้า-ออกงานของพนักงาน</p>
                </div>

                <div className="mt-4 md:mt-0 flex bg-gray-100 p-1 rounded-lg">
                    {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterStatus === status
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {status === 'PENDING' ? 'รออนุมัติ' : status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {isLoading ? (
                    <div className="p-12 text-center text-gray-400">กำลังโหลดข้อมูล...</div>
                ) : requests.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                        <CheckCircleIcon className="w-16 h-16 text-gray-200 mb-4" />
                        ไม่มีคำร้องขอในหมวดหมู่นี้
                    </div>
                ) : (
                    requests.map((req: any) => (
                        <div key={req.id} className="p-6 hover:bg-gray-50/50 transition duration-150">
                            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">

                                <div className="flex-1 flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                                        {req.employee.user.name?.charAt(0) || "U"}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                            {req.employee.user.name}
                                            <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {req.employee.department?.name || "ไม่ระบุสังกัด"}
                                            </span>
                                        </h3>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            <p><strong className="text-gray-900">วันที่ขอแก้:</strong> {format(new Date(req.date), 'dd MMMM yyyy', { locale: th })}</p>
                                            <p>
                                                <strong className="text-gray-900">ขอเข้างาน:</strong> {req.requestedCheckIn ? format(new Date(req.requestedCheckIn), 'HH:mm น.') : '-'}  |&nbsp;
                                                <strong className="text-gray-900">ขอออกงาน:</strong> {req.requestedCheckOut ? format(new Date(req.requestedCheckOut), 'HH:mm น.') : '-'}
                                            </p>
                                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 mt-2 text-yellow-800">
                                                <span className="font-semibold block mb-1">💬 เหตุผลที่พนักงานระบุ:</span>
                                                {req.reason}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:w-1/3 space-y-3">
                                    {req.status === 'PENDING' ? (
                                        <div className="bg-white border rounded-xl p-4 shadow-sm">
                                            <textarea
                                                className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                                rows={2}
                                                placeholder="หมายเหตุจาก HR (แสดงให้พนักงานเห็น)..."
                                                value={comment[req.id] || ""}
                                                onChange={(e) => handleCommentChange(req.id, e.target.value)}
                                            ></textarea>
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => handleAction(req.id, "APPROVED")}
                                                    disabled={isSubmitting}
                                                    className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1 border border-emerald-200 disabled:opacity-50"
                                                >
                                                    <CheckCircleIcon className="w-5 h-5" /> อนุมัติ
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, "REJECTED")}
                                                    disabled={isSubmitting}
                                                    className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1 border border-red-200 disabled:opacity-50"
                                                >
                                                    <XCircleIcon className="w-5 h-5" /> ไม่อนุมัติ
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 border rounded-xl p-4">
                                            <p className="text-sm font-medium mb-1">
                                                สถานะ:
                                                <span className={`ml-2 px-2.5 py-1 text-xs rounded-full font-bold uppercase tracking-wide
                                                    ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}
                                                `}>
                                                    {req.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                                                </span>
                                            </p>
                                            {req.adminComment && (
                                                <p className="text-xs text-gray-500 mt-2 bg-white p-2 border rounded-md">
                                                    <strong>HR Comment:</strong> {req.adminComment}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide text-right">
                                                ตรวจสอบโดย: {req.reviewedBy?.name || "System"}
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
