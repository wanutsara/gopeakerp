"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

const AVAILABLE_MODULES = [
    { key: "EXECUTIVE", label: "ระดับผู้บริหาร (Executive Boardroom & Settings)" },
    { key: "OMS", label: "ปฏิบัติการ (Sales, Inventory, Warehouse)" },
    { key: "FINANCE", label: "การเงินและบัญชี (Finance & AP)" },
    { key: "HR", label: "งานบุคคล (Payroll, Org Chart)" }
];

export default function RolesPage() {
    const { data: roles, error, isLoading, mutate } = useSWR("/api/settings/roles", fetcher);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRoleId, setCurrentRoleId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        permissions: AVAILABLE_MODULES.map(m => ({ module: m.key, canRead: false, canWrite: false, canDelete: false }))
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const handleOpenCreate = () => {
        setFormData({
            name: "",
            description: "",
            permissions: AVAILABLE_MODULES.map(m => ({ module: m.key, canRead: false, canWrite: false, canDelete: false }))
        });
        setIsEditing(false);
        setCurrentRoleId(null);
        setSaveError("");
        setIsModalOpen(true);
    };

    const handleOpenEdit = (role: any) => {
        // Map existing permissions, filling in missing modules with defaults
        const perms = AVAILABLE_MODULES.map(m => {
            const existing = role.permissions.find((p: any) => p.module === m.key);
            return existing || { module: m.key, canRead: false, canWrite: false, canDelete: false };
        });

        setFormData({
            name: role.name,
            description: role.description || "",
            permissions: perms,
        });
        setCurrentRoleId(role.id);
        setIsEditing(true);
        setSaveError("");
        setIsModalOpen(true);
    };

    const handleTogglePermission = (index: number, field: "canRead" | "canWrite" | "canDelete") => {
        const newPerms = [...formData.permissions];
        newPerms[index][field] = !newPerms[index][field];
        setFormData({ ...formData, permissions: newPerms });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError("");

        try {
            const url = isEditing && currentRoleId ? `/api/settings/roles/${currentRoleId}` : `/api/settings/roles`;
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save role");
            }

            mutate();
            setIsModalOpen(false);
        } catch (error: any) {
            setSaveError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสิทธิ์ '${name}'?`)) return;

        try {
            const res = await fetch(`/api/settings/roles/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Failed to delete role");
                return;
            }
            mutate();
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        }
    };

    if (isLoading) return <div className="p-8 text-gray-500">กำลังโหลด...</div>;
    if (error) return <div className="p-8 text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">การจัดการสิทธิ์ใช้งาน (Roles)</h1>
                    <p className="text-sm text-gray-500 mt-1">ตั้งค่าและควบคุมการเข้าถึงระบบต่างๆ ของพนักงาน</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow"
                >
                    + สร้างบทบาทใหม่
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles && roles.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white border border-gray-100 rounded-3xl shadow-sm">
                        ยังไม่มีบทบาทที่กำหนดเอง
                    </div>
                ) : (
                    roles.map((role: any) => (
                        <div key={role.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{role.description || "ไม่มีคำอธิบาย"}</p>
                                </div>
                                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                                    {role._count.users} Users
                                </span>
                            </div>

                            <div className="flex-1 space-y-2 mb-6">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">สิทธิ์การเข้าถึงโมดูล</p>
                                {role.permissions.map((p: any) => (
                                    (p.canRead || p.canWrite || p.canDelete) && (
                                        <div key={p.id} className="flex flex-wrap gap-1 text-xs">
                                            <span className="font-medium text-gray-700 w-24 truncate">{p.module}:</span>
                                            {p.canRead && <span className="text-emerald-600 bg-emerald-50 px-2 rounded">ดู</span>}
                                            {p.canWrite && <span className="text-amber-600 bg-amber-50 px-2 rounded">แก้ไข</span>}
                                            {p.canDelete && <span className="text-rose-600 bg-rose-50 px-2 rounded">ลบ</span>}
                                        </div>
                                    )
                                ))}
                            </div>

                            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => handleOpenEdit(role)}
                                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium transition"
                                >
                                    แก้ไขสิทธิ์
                                </button>
                                <button
                                    onClick={() => handleDelete(role.id, role.name)}
                                    className="px-4 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-sm font-medium transition"
                                >
                                    ลบ
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden p-6 sm:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {isEditing ? "แก้ไขบทบาท (Edit Role)" : "สร้างบทบาทใหม่ (New Role)"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อบทบาท (Role Name) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required
                                        className="w-full border-gray-200 rounded-xl px-4 py-2.5 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        placeholder="เช่น ฝ่ายบุคคล, ผู้จัดการทั่วไป"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">คำอธิบาย</label>
                                    <input
                                        type="text"
                                        className="w-full border-gray-200 rounded-xl px-4 py-2.5 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        placeholder="จัดการข้อมูลพนักงาน..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">การกำหนดสิทธิ์แยกตามระบบ (Permissions)</h3>
                                <div className="space-y-3">
                                    {formData.permissions.map((perm, index) => {
                                        const modDef = AVAILABLE_MODULES.find(m => m.key === perm.module);
                                        return (
                                            <div key={perm.module} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="font-semibold text-gray-800 text-sm">{modDef?.label || perm.module}</div>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center space-x-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={perm.canRead}
                                                            onChange={() => handleTogglePermission(index, "canRead")}
                                                            className="rounded text-emerald-500 focus:ring-emerald-500/20"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">ดู</span>
                                                    </label>
                                                    <label className="flex items-center space-x-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={perm.canWrite}
                                                            onChange={() => handleTogglePermission(index, "canWrite")}
                                                            className="rounded text-amber-500 focus:ring-amber-500/20"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">เพิ่ม/แก้</span>
                                                    </label>
                                                    <label className="flex items-center space-x-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={perm.canDelete}
                                                            onChange={() => handleTogglePermission(index, "canDelete")}
                                                            className="rounded text-rose-500 focus:ring-rose-500/20"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">ลบ</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {saveError && (
                                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl font-medium border border-red-100">{saveError}</div>
                            )}

                            <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-white shadow-[0_-20px_20px_-15px_rgba(255,255,255,1)]">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border-none rounded-xl text-sm font-bold transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                                >
                                    {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
