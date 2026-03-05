"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function CompanySettingsPage() {
    const { data: settings, mutate } = useSWR("/api/hr/settings", fetcher);

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [formData, setFormData] = useState({
        defaultLat: "",
        defaultLng: "",
        defaultRadius: "100",
        defaultWorkStart: "09:00",
        defaultWorkEnd: "18:00"
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                defaultLat: settings.defaultLat?.toString() || "",
                defaultLng: settings.defaultLng?.toString() || "",
                defaultRadius: settings.defaultRadius?.toString() || "100",
                defaultWorkStart: settings.defaultWorkStart || "09:00",
                defaultWorkEnd: settings.defaultWorkEnd || "18:00"
            });
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage("");
        setErrorMessage("");
        try {
            const res = await fetch("/api/hr/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setSuccessMessage("บันทึกการตั้งค่าระบบบุคคลสำเร็จ");
                mutate();
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                const data = await res.json();
                setErrorMessage(data.error || "บันทึกล้มเหลว กรุณาลองใหม่อีกครั้ง");
            }
        } catch (error) {
            console.error(error);
            setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ตั้งค่าระบบ (Global HR Settings)</h1>
                <p className="mt-2 text-sm text-gray-500">
                    ข้อมูลส่วนนี้คือ "ค่ามาตรฐาน" หากไม่ได้มีการเจาะจงตั้งเวลาหรือพิกัดที่ระดับแผนกหรือระดับบุคคล พนักงานทุกคนจะถูกอ้างอิงจากข้อมูลในหน้านี้แทนค่ะ
                </p>
            </div>

            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium shadow-sm flex pl-5">
                    <span className="mr-2">✓</span> {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium shadow-sm flex pl-5">
                    <span className="mr-2">⚠️</span> {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-8">

                <section>
                    <div className="border-b border-gray-100 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-gray-900">เวลาเข้า-ออกงาน (Business Hours)</h3>
                        <p className="text-sm text-gray-500 mt-1">ตั้งค่าเวลาทำการปกติ เพื่อใช้คำนวณการมาสายและการคิดค่าล่วงเวลาเบื้องต้น</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">เวลาเริ่มงาน (Check-In)</label>
                            <input
                                type="time" name="defaultWorkStart" value={formData.defaultWorkStart} onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">เวลาเลิกงาน (Check-Out)</label>
                            <input
                                type="time" name="defaultWorkEnd" value={formData.defaultWorkEnd} onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                required
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <div className="border-b border-gray-100 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-gray-900">พิกัดสถานที่ทำงาน (GPS Office Coordinates)</h3>
                        <p className="text-sm text-gray-500 mt-1">ใช้เป็นพิกัดกึ่งกลางสำหรับการเช็คอินสถานที่ทำงาน คุณสามารถหาบน Google Maps ได้</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ละติจูด (Latitude)</label>
                            <input
                                type="number" step="any" name="defaultLat" value={formData.defaultLat} onChange={handleChange}
                                placeholder="เช่น 13.7563"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ลองจิจูด (Longitude)</label>
                            <input
                                type="number" step="any" name="defaultLng" value={formData.defaultLng} onChange={handleChange}
                                placeholder="เช่น 100.5018"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">รัสมีที่อนุญาต (เมตร)</label>
                            <input
                                type="number" name="defaultRadius" value={formData.defaultRadius} onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">ระยะทางสูงสุดจากพิกัด (แนะนำ 100 เมตร)</p>
                        </div>
                    </div>
                </section>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit" disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50"
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                    </button>
                </div>
            </form>
        </div>
    );
}
