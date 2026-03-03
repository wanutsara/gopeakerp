"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DepartmentsPage() {
    const { data: departments, error, isLoading, mutate } = useSWR("/api/hr/departments", fetcher);

    // Create State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [radius, setRadius] = useState("");
    const [workStart, setWorkStart] = useState("");
    const [workEnd, setWorkEnd] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Edit Modal State
    const [editingDept, setEditingDept] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await fetch("/api/hr/departments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, lat, lng, radius, workStart, workEnd }),
            });
            if (res.ok) {
                setName("");
                setDescription("");
                setLat(""); setLng(""); setRadius(""); setWorkStart(""); setWorkEnd("");
                setShowAdvanced(false);
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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/hr/departments/${editingDept.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingDept),
            });
            if (res.ok) {
                setEditingDept(null);
                mutate();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to update department");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ลบแผนกนี้ใช่หรือไม่? พนักงานที่อยู่ในแผนกจะเหลือแค่ข้อมูลว่าอยู่แผนก 'ไม่มีสังกัด' ชั่วคราว")) return;
        try {
            const res = await fetch(`/api/hr/departments/${id}`, { method: "DELETE" });
            if (res.ok) {
                mutate();
            } else {
                alert("ไม่สามารถลบแผนกได้");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">แผนก (Departments)</h1>
                    <p className="mt-1 text-sm text-gray-500">จัดการแผนกต่างๆ ตลอดจนกำหนดพิกัด GPS และเวลาเข้างานเฉพาะแผนก</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to create dept */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">เพิ่มแผนกใหม่</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแผนก</label>
                            <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="เช่น ฝ่ายบัญชี" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="อธิบายหน้าที่รอมๆ" />
                        </div>

                        <div>
                            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                {showAdvanced ? "▼ ซ่อนการตั้งค่าเพิ่มเติม" : "▶ การตั้งค่าเวลาสถานที่เฉพาะแผนก"}
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="space-y-4 border border-blue-100 bg-blue-50/50 p-4 rounded-xl mt-2">
                                <p className="text-xs text-blue-800 mb-2 font-medium">ถ้าปล่อยว่าง พนักงานจะอิงจาก Settings ของบริษัท</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-gray-600">เวลาเริ่มงาน</label><input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="w-full text-sm p-2 border rounded-md" /></div>
                                    <div><label className="text-xs text-gray-600">เวลาเลิกงาน</label><input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="w-full text-sm p-2 border rounded-md" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-1"><label className="text-xs text-gray-600">Latitude</label><input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className="w-full text-sm p-2 border rounded-md" placeholder="13.756" /></div>
                                    <div className="col-span-1"><label className="text-xs text-gray-600">Longitude</label><input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className="w-full text-sm p-2 border rounded-md" placeholder="100.501" /></div>
                                    <div className="col-span-2"><label className="text-xs text-gray-600">รัศมี Check-in (เมตร)</label><input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full text-sm p-2 border rounded-md" placeholder="100" /></div>
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={isCreating} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 transition disabled:opacity-50">
                            {isCreating ? "กำลังบันทึก..." : "ยืนยันการเพิ่มแผนก"}
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
                                    <div key={dept.id} className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-900 text-lg">{dept.name}</h3>
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
                                                พนักงาน {dept._count?.employees || 0} คน
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-3">{dept.description || "ไม่มีคำอธิบาย"}</p>

                                        {(dept.workStart || dept.lat) && (
                                            <div className="text-xs text-purple-700 bg-purple-50 p-2 rounded border border-purple-100 mb-3">
                                                {dept.workStart && <span>🕒 {dept.workStart} - {dept.workEnd} </span>}
                                                {dept.lat && <span>📍 พิกัดแบบกำหนดเอง </span>}
                                            </div>
                                        )}

                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-4 pt-4 border-t border-gray-100">
                                            <button onClick={() => setEditingDept({ ...dept, defaultLat: dept.lat || "", defaultLng: dept.lng || "", defaultRadius: dept.radius || "" })} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium">แก้ไข</button>
                                            <button onClick={() => handleDelete(dept.id)} className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition font-medium">ลบ</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-10 text-center text-gray-500">ยังไม่มีแผนกในระบบ</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingDept && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">แก้ไขแผนก</h2>
                            <button onClick={() => setEditingDept(null)} className="text-gray-400 hover:text-gray-600 font-bold p-1">&times;</button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div><label className="text-sm text-gray-600">ชื่อแผนก</label><input required type="text" value={editingDept.name} onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                            <div><label className="text-sm text-gray-600">รายละเอียด</label><input type="text" value={editingDept.description} onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>

                            <hr className="my-4" />
                            <h3 className="text-sm font-bold text-gray-800">การตั้งค่าพิเศษของแผนก (Overrides)</h3>
                            <p className="text-xs text-gray-500 mb-2">ปล่อยว่างไว้หากต้องการใช้ค่าจากตั้งค่าศูนย์กลางของเว็บไซต์</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-gray-600">เวลาเริ่มงาน</label><input type="time" value={editingDept.workStart || ""} onChange={(e) => setEditingDept({ ...editingDept, workStart: e.target.value })} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs text-gray-600">เวลาเลิกงาน</label><input type="time" value={editingDept.workEnd || ""} onChange={(e) => setEditingDept({ ...editingDept, workEnd: e.target.value })} className="w-full p-2 border rounded" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-gray-600">Latitude</label><input type="number" step="any" value={editingDept.lat || ""} onChange={(e) => setEditingDept({ ...editingDept, lat: e.target.value })} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs text-gray-600">Longitude</label><input type="number" step="any" value={editingDept.lng || ""} onChange={(e) => setEditingDept({ ...editingDept, lng: e.target.value })} className="w-full p-2 border rounded" /></div>
                                <div className="col-span-2"><label className="text-xs text-gray-600">รัศมี Check-in (เมตร)</label><input type="number" value={editingDept.radius || ""} onChange={(e) => setEditingDept({ ...editingDept, radius: e.target.value })} className="w-full p-2 border rounded" /></div>
                            </div>

                            <button type="submit" disabled={isUpdating} className="w-full mt-6 bg-blue-600 text-white font-medium rounded-lg px-4 py-3 hover:bg-blue-700 disabled:opacity-50">
                                {isUpdating ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
