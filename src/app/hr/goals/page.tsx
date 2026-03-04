"use client";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HRGoalsPage() {
    const { data: goals, mutate } = useSWR("/api/hr/goals", fetcher);
    const { data: employees } = useSWR("/api/hr/employees", fetcher);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        employeeId: "",
        title: "",
        description: "",
        targetValue: "",
        unit: "%",
        deadline: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/hr/goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error("Failed to create goal");

            mutate();
            setIsModalOpen(false);
            setFormData({ employeeId: "", title: "", description: "", targetValue: "", unit: "%", deadline: "" });
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการสร้างเป้าหมาย");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!goals) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">🎯 ระบบจัดการเป้าหมาย (KPI Tracker)</h1>
                    <p className="text-gray-500 mt-2">ติดตามและจัดการเป้าหมายความสำเร็จของพนักงานรายบุคคล</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-md transition-colors"
                >
                    + มอบหมายเป้าหมายใหม่
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                        <tr>
                            <th className="p-4 pl-6">พนักงาน</th>
                            <th className="p-4">เป้าหมาย (KPI)</th>
                            <th className="p-4">ความคืบหน้า</th>
                            <th className="p-4">สถานะ</th>
                            <th className="p-4">กำหนดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {goals.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">ยังไม่มีข้อมูลเป้าหมาย</td></tr>
                        ) : (
                            goals.map((g: any) => {
                                const percent = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) || 0;
                                const isAchieved = g.status === 'ACHIEVED';

                                return (
                                    <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 pl-6 font-medium text-gray-900">
                                            {g.employee?.user?.name || "ไม่ทราบชื่อ"}
                                            <div className="text-xs text-gray-500 font-normal">{g.employee?.department?.name || "ไม่มีแผนก"}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{g.title}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs">{g.description}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-indigo-600 mb-1">{g.currentValue} / {g.targetValue} {g.unit} ({percent}%)</div>
                                            <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-2 rounded-full ${isAchieved ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${isAchieved ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isAchieved ? '🏆 สำเร็จแล้ว' : '🔄 กำลังดำเนินการ'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500">
                                            {g.deadline ? new Date(g.deadline).toLocaleDateString('th-TH') : "-"}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Goal Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
                            <h3 className="font-bold text-indigo-900 text-lg">🎯 มอบหมายเป้าหมายใหม่</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">พนักงานที่รับผิดชอบ</label>
                                <select
                                    required
                                    value={formData.employeeId}
                                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="w-full border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="" disabled>-- เลือกพนักงาน --</option>
                                    {employees?.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>{emp.user?.name} ({emp.position})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อเป้าหมาย (KPI)</label>
                                <input
                                    required type="text"
                                    value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="เช่น ทำยอดขายสะสม, สรุปบัญชีไตรมาส..."
                                    className="w-full border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">รายละเอียด (ถ้ามี)</label>
                                <textarea
                                    rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">เป้าหมาย (ตัวเลข)</label>
                                    <input
                                        required type="number" min="1" step="0.1"
                                        value={formData.targetValue} onChange={e => setFormData({ ...formData, targetValue: e.target.value })}
                                        className="w-full border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">หน่วยนับ</label>
                                    <input
                                        type="text"
                                        value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="เช่น บาท, %, ครั้ง"
                                        className="w-full border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">กำหนดส่ง (Deadline)</label>
                                <input
                                    type="date"
                                    value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                    {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการตั้งเป้าหมาย"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
