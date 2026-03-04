"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { PhotoIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CreateEmployeePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "STAFF",
        employeeType: "MONTHLY",
        position: "",
        wageRate: "",
        bankAccount: "",
        status: "ACTIVE",
        departmentId: "",
        image: "",
        phoneNumber: ""
    });

    const { data: departments } = useSWR("/api/hr/departments", fetcher);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (limit to 2MB to avoid huge DB strings for MVP)
            if (file.size > 2 * 1024 * 1024) {
                alert("กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/hr/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Something went wrong");
            }

            router.push("/hr");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">เพิ่มพนักงานใหม่</h1>
                    <p className="mt-1 text-sm text-gray-500">สร้างบัญชีผู้ใช้งานและบันทึกข้อมูลบุคลากร</p>
                </div>
                <Link href="/hr" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition flex items-center">
                    <span className="mr-2">←</span> กลับสู่หน้ารายชื่อ
                </Link>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8 space-y-8">

                    {/* รูปประจำตัว */}
                    <section className="flex flex-col items-center pb-8 border-b border-gray-100">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {formData.image ? (
                                <img src={formData.image} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-gray-50 flex items-center justify-center border-4 border-white shadow-lg text-gray-400 group-hover:bg-gray-100 transition">
                                    <UserCircleIcon className="w-16 h-16" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <PhotoIcon className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-gray-900">รูปประจำตัว (Profile Picture)</h3>
                        <p className="mt-1 text-xs text-gray-500">คลิกที่รูปภาพเพื่ออัปโหลด (ขนาดไม่เกิน 2MB)</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </section>

                    {/* ข้อมูลการเข้าสู่ระบบ */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">ข้อมูลการเข้าสู่ระบบ (User Account)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="นาย สมหมาย ใจดี" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล (ล็อกอิน)</label>
                                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="sommai@tamaya.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์</label>
                                <input type="text" name="phoneNumber" value={formData.phoneNumber || ""} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="08x-xxx-xxxx" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน <span className="text-xs font-normal text-gray-500">(ค่าเริ่มต้น 123456)</span></label>
                                <input disabled type="password" value="123456" className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">สิทธิ์การใช้งานระบบ (Role)</label>
                                <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                    <option value="STAFF">พนักงานทั่วไป (Staff)</option>
                                    <option value="MANAGER">ผู้จัดการ (Manager)</option>
                                    <option value="OWNER">เจ้าของกิจการ (Owner)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ข้อมูลพนักงาน */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">ข้อมูลงานและค่าจ้าง (HR Data)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ตำแหน่งงาน</label>
                                <input required type="text" name="position" value={formData.position} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="ฝ่ายแพ็คสินค้า" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">บัญชีธนาคาร</label>
                                <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="กสิกรไทย 123-4-56789-0" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทการจ้าง</label>
                                <select name="employeeType" value={formData.employeeType} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                    <option value="MONTHLY">รายเดือน (Monthly)</option>
                                    <option value="DAILY">รายวัน (Daily)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    อัตราค่าจ้าง {formData.employeeType === "MONTHLY" ? "(รายเดือน)" : "(ต่อวัน)"}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">฿</span>
                                    <input required type="number" name="wageRate" value={formData.wageRate} onChange={handleChange} className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder={formData.employeeType === "MONTHLY" ? "20000" : "400"} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">แผนก (Department)</label>
                                <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                    <option value="">-- ไม่ระบุแผนก --</option>
                                    {departments && departments.map((dept: any) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button
                        type="button"
                        onClick={() => router.push("/hr")}
                        className="mr-4 px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึกข้อมูลพนักงาน"}
                    </button>
                </div>
            </form>
        </div>
    );
}
