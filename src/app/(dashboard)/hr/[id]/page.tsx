"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EditEmployeePage() {
    const router = useRouter();
    const params = useParams();
    const { data: session } = useSession();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "",
        employeeType: "",
        position: "",
        wageRate: "",
        bankAccount: "",
        status: "",
        departmentId: "",
    });

    const { data: departments } = useSWR("/api/hr/departments", fetcher);

    useEffect(() => {
        // Fetch employee data
        const fetchEmployee = async () => {
            try {
                const res = await fetch(`/api/hr/employees`);
                const employees = await res.json();
                const emp = employees.find((e: any) => e.id === params.id);

                if (!emp) throw new Error("Employee not found");

                setFormData({
                    name: emp.user.name || "",
                    email: emp.user.email || "",
                    role: emp.user.role || "STAFF",
                    employeeType: emp.employeeType || "MONTHLY",
                    position: emp.position || "",
                    wageRate: emp.wageRate.toString(),
                    bankAccount: emp.bankAccount || "",
                    status: emp.status || "ACTIVE",
                    departmentId: emp.departmentId || "",
                });
            } catch (err: any) {
                setError(err.message || "Failed to load employee");
            } finally {
                setFetching(false);
            }
        };

        // In a real app we'd make a GET /api/hr/employees/[id]
        fetchEmployee();
    }, [params.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/hr/employees/${params.id}`, {
                method: "PUT",
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

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/hr/employees/${params.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete");

            router.push("/hr");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">แก้ไขข้อมูลพนักงาน</h1>
                    <p className="mt-1 text-sm text-gray-500">อัปเดตรายละเอียดและสิทธิ์การใช้งานระบบ</p>
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

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 sm:p-8 space-y-8">

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">ข้อมูลการเข้าสู่ระบบ (User Account)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล (ไม่สามารถเปลี่ยนได้)</label>
                                <input type="email" value={formData.email} disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl cursor-not-allowed" />
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

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">ข้อมูลงานและค่าจ้าง (HR Data)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ตำแหน่งงาน</label>
                                <input required type="text" name="position" value={formData.position} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">บัญชีธนาคาร</label>
                                <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">แผนก (Department)</label>
                                <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                    <option value="">ไม่ระบุแผนก</option>
                                    {departments?.map((dept: any) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทการจ้าง</label>
                                <select name="employeeType" value={formData.employeeType} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                    <option value="MONTHLY">รายเดือน (Monthly)</option>
                                    <option value="DAILY">รายวัน (Daily)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">อัตราค่าจ้าง (บาท)</label>
                                <input required type="number" name="wageRate" value={formData.wageRate} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">สถานะการทำงาน</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                    <option value="ACTIVE">ยังทำงานอยู่ (Active)</option>
                                    <option value="INACTIVE">ลาออก/หยุดงาน (Inactive)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="text-red-600 hover:text-red-800 text-sm font-medium px-4"
                    >
                        ลบพนักงานระบบ
                    </button>
                    <div className="flex">
                        <button type="button" onClick={() => router.push("/hr")} className="mr-4 px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition">
                            ยกเลิก
                        </button>
                        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50">
                            {loading ? "กำลังบันทึก..." : "อัปเดตข้อมูล"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
