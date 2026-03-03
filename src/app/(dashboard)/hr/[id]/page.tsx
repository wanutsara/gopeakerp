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
    const [activeTab, setActiveTab] = useState("INFO");
    const [employeeData, setEmployeeData] = useState<any>(null);

    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [docForm, setDocForm] = useState({ type: 'PAYSLIP', title: '', fileUrl: '' });

    const [formData, setFormData] = useState({
        // Auth / Basics
        name: "", email: "", role: "",

        // Personal Info
        idCardNumber: "", dob: "", gender: "", address: "", emergencyContact: "", emergencyRelation: "",

        // Work Status
        employeeType: "", position: "", wageRate: "", status: "", bankAccount: "",
        departmentId: "", managerId: "", startDate: "", probationEndDate: "",

        // Culture
        mbti: "", enneagram: "", tshirtSize: "", foodAllergies: ""
    });

    const { data: departments } = useSWR("/api/hr/departments", fetcher);
    const { data: employeesList } = useSWR("/api/hr/employees", fetcher);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const res = await fetch(`/api/hr/employees/${params.id}`);
                if (!res.ok) throw new Error("Employee not found");
                const emp = await res.json();

                setEmployeeData(emp);

                setFormData({
                    name: emp.user?.name || "",
                    email: emp.user?.email || "",
                    role: emp.user?.role || "STAFF",

                    idCardNumber: emp.idCardNumber || "",
                    dob: emp.dob ? emp.dob.split('T')[0] : "",
                    gender: emp.gender || "",
                    address: emp.address || "",
                    emergencyContact: emp.emergencyContact || "",
                    emergencyRelation: emp.emergencyRelation || "",

                    employeeType: emp.employeeType || "MONTHLY",
                    position: emp.position || "",
                    wageRate: emp.wageRate?.toString() || "0",
                    bankAccount: emp.bankAccount || "",
                    status: emp.status || "ACTIVE",
                    departmentId: emp.departmentId || "",
                    managerId: emp.managerId || "",
                    startDate: emp.startDate ? emp.startDate.split('T')[0] : "",
                    probationEndDate: emp.probationEndDate ? emp.probationEndDate.split('T')[0] : "",

                    mbti: emp.mbti || "",
                    enneagram: emp.enneagram || "",
                    tshirtSize: emp.tshirtSize || "",
                    foodAllergies: emp.foodAllergies || "",
                });
            } catch (err: any) {
                setError(err.message || "Failed to load employee");
            } finally {
                setFetching(false);
            }
        };

        fetchEmployee();
    }, [params.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    const handleUploadDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/hr/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: params.id,
                    ...docForm
                })
            });
            if (res.ok) {
                setIsDocModalOpen(false);
                setDocForm({ type: 'PAYSLIP', title: '', fileUrl: '' });
                const updatedRes = await fetch(`/api/hr/employees/${params.id}`);
                const updatedEmp = await updatedRes.json();
                setEmployeeData(updatedEmp);
            } else {
                alert("Failed to upload document");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;
        try {
            const res = await fetch(`/api/hr/documents/${docId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                const updatedRes = await fetch(`/api/hr/employees/${params.id}`);
                const updatedEmp = await updatedRes.json();
                setEmployeeData(updatedEmp);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (fetching) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">แก้ไขโปรไฟล์พนักงาน</h1>
                    <p className="mt-2 text-sm text-gray-500">อัปเดตรายละเอียดและสิทธิ์การใช้งานระบบที่ครอบคลุม 360 องศา</p>
                </div>
                <Link href="/hr" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition flex items-center bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    <span className="mr-2">←</span> หน้ารายชื่อ
                </Link>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium shadow-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/50 px-4 pt-4 overflow-x-auto">
                    <button type="button" onClick={() => setActiveTab('INFO')} className={`py-3 px-6 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'INFO' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        ข้อมูลพื้นฐาน (Personal Info)
                    </button>
                    <button type="button" onClick={() => setActiveTab('WORK')} className={`py-3 px-6 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'WORK' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        ข้อมูลการจ้างงาน (Work Status)
                    </button>
                    <button type="button" onClick={() => setActiveTab('CULTURE')} className={`py-3 px-6 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'CULTURE' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        บุคลิกภาพ & วัฒนธรรม (Culture Fit)
                    </button>
                    <button type="button" onClick={() => setActiveTab('LEAVES_DOCS')} className={`py-3 px-6 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'LEAVES_DOCS' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        วันลา & เอกสาร (Leaves & Docs)
                    </button>
                </div>

                <div className="p-6 sm:p-8">
                    {/* TAB 1: PERSONAL INFO */}
                    {activeTab === 'INFO' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">ข้อมูลบัญชีระบบ</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                        <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล (ล็อกอิน)</label>
                                        <input type="email" value={formData.email} disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">สิทธิ์ของระบบ (App Role)</label>
                                        <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                            <option value="STAFF">พนักงานทั่วไป (STAFF)</option>
                                            <option value="MANAGER">ผู้จัดการ (MANAGER)</option>
                                            <option value="OWNER">เจ้าของกิจการ (OWNER)</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">ข้อมูลส่วนบุคคล</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">เลขบัตรประชาชน</label>
                                        <input type="text" maxLength={13} name="idCardNumber" value={formData.idCardNumber} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="เลข 13 หลัก" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">วันเดือนปีเกิด</label>
                                        <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">เพศสภาพ</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                            <option value="">ไม่ระบุ</option>
                                            <option value="MALE">ชาย (Male)</option>
                                            <option value="FEMALE">หญิง (Female)</option>
                                            <option value="OTHER">อื่นๆ / หลากหลายทางเพศ</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ที่อยู่ปัจจุบัน</label>
                                        <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-gray-400" placeholder="บ้านเลขที่, ถนน, แขวง, เขต, จังหวัด, รหัสไปรษณีย์"></textarea>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">ติดต่อฉุกเฉิน (Emergency)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อและเบอร์โทรติดต่อฉุกเฉิน</label>
                                        <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="เช่น มารดา: 081-xxx-xxxx" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ความสัมพันธ์</label>
                                        <input type="text" name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="บิดา, มารดา, พี่น้อง, สามี/ภรรยา" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* TAB 2: WORK STATUS */}
                    {activeTab === 'WORK' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">สถานะองค์กร</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">สถานะพนักงาน</label>
                                        <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                            <option value="ACTIVE">ยังทำงานอยู่ (Active)</option>
                                            <option value="INACTIVE">ลาออก/พ้นสภาพ (Inactive)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ตำแหน่ง (Position) <span className="text-red-500">*</span></label>
                                        <input required type="text" name="position" value={formData.position} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">หัวหน้าโดยตรง (Line Manager)</label>
                                        <select name="managerId" value={formData.managerId} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                            <option value="">ไม่มีหัวหน้า / ขึ้นตรงผู้บริหาร</option>
                                            {employeesList?.map((empOption: any) => (
                                                empOption.id !== params.id && (
                                                    <option key={empOption.id} value={empOption.id}>{empOption.user?.name} ({empOption.position})</option>
                                                )
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">วันเริ่มงาน (Join Date)</label>
                                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">วันสิ้นสุดทดลองงาน (Probation Date)</label>
                                        <input type="date" name="probationEndDate" value={formData.probationEndDate} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">บัญชีเงินเดือน</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบการจ้าง</label>
                                        <select name="employeeType" value={formData.employeeType} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                            <option value="MONTHLY">รายเดือน (Monthly)</option>
                                            <option value="DAILY">รายวัน (Daily)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">อัตราค่าจ้าง (บาท) <span className="text-red-500">*</span></label>
                                        <input required type="number" name="wageRate" value={formData.wageRate} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">หมายเลขบัญชีธนาคาร</label>
                                        <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="123-4-56789-0 (กสิกรไทย)" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* TAB 3: CULTURE */}
                    {activeTab === 'CULTURE' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">ผลทดสอบบุคลิกภาพ (Personality)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                                        <label className="block text-sm font-semibold text-purple-900 mb-2">MBTI Type</label>
                                        <select name="mbti" value={formData.mbti} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-purple-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition">
                                            <option value="">ไม่ระบุ</option>
                                            <optgroup label="นักวิเคราะห์ (Analysts)">
                                                <option value="INTJ">INTJ (สถาปนิก)</option>
                                                <option value="INTP">INTP (นักตรรกะ)</option>
                                                <option value="ENTJ">ENTJ (ผู้บัญชาการ)</option>
                                                <option value="ENTP">ENTP (นักโต้วาที)</option>
                                            </optgroup>
                                            <optgroup label="นักการทูต (Diplomats)">
                                                <option value="INFJ">INFJ (ผู้แนะนำ)</option>
                                                <option value="INFP">INFP (ผู้ไกล่เกลี่ย)</option>
                                                <option value="ENFJ">ENFJ (ตัวเอก)</option>
                                                <option value="ENFP">ENFP (นักรณรงค์)</option>
                                            </optgroup>
                                            <optgroup label="ผู้เฝ้ายาม (Sentinels)">
                                                <option value="ISTJ">ISTJ (นักคำนวณ)</option>
                                                <option value="ISFJ">ISFJ (ผู้ตั้งรับ)</option>
                                                <option value="ESTJ">ESTJ (ผู้บริหาร)</option>
                                                <option value="ESFJ">ESFJ (ผู้ให้คำปรึกษา)</option>
                                            </optgroup>
                                            <optgroup label="นักสำรวจ (Explorers)">
                                                <option value="ISTP">ISTP (ผู้เชี่ยวชาญ)</option>
                                                <option value="ISFP">ISFP (นักผจญภัย)</option>
                                                <option value="ESTP">ESTP (ผู้ประกอบการ)</option>
                                                <option value="ESFP">ESFP (ผู้มอบความบันเทิง)</option>
                                            </optgroup>
                                        </select>
                                        <p className="mt-2 text-xs text-purple-600">ช่วยอธิบายสไตล์การทำงาน การตัดสินใจ และการสื่อสาร</p>
                                    </div>
                                    <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100">
                                        <label className="block text-sm font-semibold text-orange-900 mb-2">Enneagram (นพลักษณ์ 1-9)</label>
                                        <select name="enneagram" value={formData.enneagram} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-orange-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition">
                                            <option value="">ไม่ระบุ</option>
                                            <option value="1">Type 1 - The Reformer (คนสมบูรณ์แบบ)</option>
                                            <option value="2">Type 2 - The Helper (ผู้ให้)</option>
                                            <option value="3">Type 3 - The Achiever (นักความสำเร็จ)</option>
                                            <option value="4">Type 4 - The Individualist (คนโศกซึ้ง)</option>
                                            <option value="5">Type 5 - The Investigator (นักสังเกตการณ์)</option>
                                            <option value="6">Type 6 - The Loyalist (นักจงรักภักดี)</option>
                                            <option value="7">Type 7 - The Enthusiast (นักผจญภัย)</option>
                                            <option value="8">Type 8 - The Challenger (เจ้านาย)</option>
                                            <option value="9">Type 9 - The Peacemaker (ผู้ประสานสิบทิศ)</option>
                                        </select>
                                        <p className="mt-2 text-xs text-orange-600">วิเคราะห์แรงจูงใจและความกลัวลึกๆ ในการทำงานร่วมทีม</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">สวัสดิการ & เสื้อผ้า</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ไซส์เสื้อบริษัท (T-Shirt Size)</label>
                                        <select name="tshirtSize" value={formData.tshirtSize} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition">
                                            <option value="">ไม่ระบุ</option>
                                            <option value="S">S</option>
                                            <option value="M">M</option>
                                            <option value="L">L</option>
                                            <option value="XL">XL</option>
                                            <option value="2XL">2XL</option>
                                            <option value="3XL">3XL</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">อาหารที่แพ้ หรือ กินไม่ได้</label>
                                        <input type="text" name="foodAllergies" value={formData.foodAllergies} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition" placeholder="เช่น แพ้กุ้ง, ไม่ทานเนื้อ, ทานมังสวิรัติ, แพ้ถั่ว" />
                                        <p className="mt-1 flex items-center text-xs text-gray-500">
                                            <svg className="w-3 h-3 justify-center text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            ข้อมูลนี้ใช้วางแผนจัดเลี้ยงทีม Team Building
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* TAB 4: LEAVES & DOCUMENTS */}
                    {activeTab === 'LEAVES_DOCS' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section>
                                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">สรุปสิทธิการลาประจำปี (Leave Balances)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {['SICK', 'PERSONAL', 'VACATION'].map(type => {
                                        const balance = employeeData?.leaveBalances?.find((b: any) => b.leaveType === type);
                                        const labels: any = { SICK: 'ลาป่วย', PERSONAL: 'ลากิจ', VACATION: 'ลาพักร้อน' };
                                        const colors: any = { SICK: 'bg-red-50 text-red-700 border-red-100', PERSONAL: 'bg-orange-50 text-orange-700 border-orange-100', VACATION: 'bg-blue-50 text-blue-700 border-blue-100' };

                                        return (
                                            <div key={type} className={`p-5 rounded-2xl border ${colors[type]}`}>
                                                <p className="text-sm font-semibold mb-1">{labels[type]} ({type})</p>
                                                {balance ? (
                                                    <div className="flex justify-between items-end mt-4">
                                                        <div>
                                                            <p className="text-3xl font-bold">{balance.usedDays}</p>
                                                            <p className="text-xs opacity-80 mt-1">ใช้ไปแล้ว (วัน)</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-bold opacity-80">{balance.totalQuota}</p>
                                                            <p className="text-xs opacity-80 mt-1">โควต้าทั้งหมด</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs opacity-70 mt-4">ยังไม่มีข้อมูลโควต้าในปีนี้</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">คลังเอกสาร (Document Vault)</h3>
                                    <button type="button" onClick={() => setIsDocModalOpen(true)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-200 transition">
                                        + อัปโหลดเอกสาร
                                    </button>
                                </div>
                                <div className="bg-white border text-sm border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">ประเภทเอกสาร</th>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">ชื่อเอกสาร</th>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">วันที่อัปโหลด</th>
                                                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {employeeData?.documents && employeeData.documents.length > 0 ? (
                                                employeeData.documents.map((doc: any) => (
                                                    <tr key={doc.id}>
                                                        <td className="px-5 py-3 text-gray-900">{doc.type}</td>
                                                        <td className="px-5 py-3 text-gray-600">
                                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                {doc.title}
                                                            </a>
                                                        </td>
                                                        <td className="px-5 py-3 text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-5 py-3 text-center text-red-500 hover:text-red-700 cursor-pointer" onClick={() => handleDeleteDoc(doc.id)}>
                                                            ลบ
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">ยังไม่มีเอกสารในระบบ</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50/80 px-6 py-5 border-t border-gray-100 flex justify-between items-center mt-2">
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                    >
                        ลบประวัติพนักงาน
                    </button>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => router.push("/hr")} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            กลับ
                        </button>
                        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50">
                            {loading ? "กำลังบันทึก..." : "อัปเดตข้อมูลพนักงาน"}
                        </button>
                    </div>
                </div>
            </form>

            {/* Document Upload Modal */}
            {isDocModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsDocModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">สร้างเอกสารใหม่</h3>
                        <form onSubmit={handleUploadDoc} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทเอกสาร</label>
                                <select
                                    value={docForm.type}
                                    onChange={(e) => setDocForm(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                    required
                                >
                                    <option value="PAYSLIP">สลิปเงินเดือน (Payslip)</option>
                                    <option value="CONTRACT">สัญญาจ้าง (Contract)</option>
                                    <option value="WARNING_LETTER">ใบเตือน (Warning Letter)</option>
                                    <option value="MEDICAL_CERT">ใบรับรองแพทย์ (Medical Certificate)</option>
                                    <option value="OTHER">อื่นๆ (Other)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเอกสารอ้างอิง</label>
                                <input
                                    type="text"
                                    value={docForm.title}
                                    onChange={(e) => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                    required
                                    placeholder="เช่น สลิปเงินเดือน ม.ค. 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์แนบ (URL)</label>
                                <input
                                    type="url"
                                    value={docForm.fileUrl}
                                    onChange={(e) => setDocForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                    required
                                    placeholder="https://..."
                                />
                                <p className="mt-1 flex items-center text-xs text-gray-500">ใส่ลิงก์ Google Drive หรือรูปภาพที่อัปโหลดไว้</p>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDocModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow"
                                >
                                    บันทึกเอกสาร
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
