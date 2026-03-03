"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DepartmentsPage() {
    const { data: departments, error, isLoading, mutate } = useSWR("/api/hr/departments", fetcher);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await fetch("/api/hr/departments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            });
            if (res.ok) {
                setName("");
                setDescription("");
                mutate();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create department");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">แผนก (Departments)</h1>
                    <p className="mt-1 text-sm text-gray-500">จัดการแผนกต่างๆ และโครงสร้างองค์กร</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to create dept */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">เพิ่มแผนกใหม่</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแผนก</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder="เช่น ฝ่ายบัญชี"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (คำอธิบาย)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder="หน้าที่หลัก..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 shadow transition-colors disabled:opacity-50"
                        >
                            {isCreating ? "กำลังชันทึก..." : "ยืนยันการเพิ่มแผนก"}
                        </button>
                    </form>
                </div>

                {/* List of depts */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">รายชื่อแผนกทั้งหมด</h2>

                    {isLoading ? (
                        <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">ไม่สามารถดึงข้อมูลได้</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {departments && departments.length > 0 ? (
                                departments.map((dept: any) => (
                                    <div key={dept.id} className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-900 text-lg">{dept.name}</h3>
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
                                                พนักงาน {dept._count?.employees || 0} คน
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2">
                                            {dept.description || "ไม่มีคำอธิบาย"}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    ยังไม่มีแผนกในระบบ กรุณาเพิ่มแผนกใหม่ด้านซ้าย
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
