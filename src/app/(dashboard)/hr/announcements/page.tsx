"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { MegaphoneIcon, UsersIcon, GlobeAsiaAustraliaIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AnnouncementsPage() {
    const { data: deptsData } = useSWR('/api/hr/departments', fetcher);
    const { data: newsData, mutate } = useSWR('/api/hr/announcements', fetcher);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        isGlobal: true,
        targetDepartmentId: "",
        type: "NEWS",
        eventDate: "",
        pollOptionsText: "",
        publishAt: "", // Date/Time string
        expireAt: ""   // Date/Time string
    });

    const announcements = newsData?.announcements || [];
    const departments = deptsData?.departments || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                content: formData.content,
                isGlobal: formData.isGlobal,
                targetDepartmentId: formData.targetDepartmentId,
                type: formData.type,
                eventDate: formData.type === 'EVENT' && formData.eventDate ? new Date(formData.eventDate).toISOString() : null,
                pollOptions: formData.type === 'POLL' && formData.pollOptionsText ? formData.pollOptionsText.split(',').map(o => o.trim()).filter(Boolean) : null,
                publishAt: formData.publishAt ? new Date(formData.publishAt).toISOString() : null,
                expireAt: formData.expireAt ? new Date(formData.expireAt).toISOString() : null
            };

            let res;
            if (editingId) {
                res = await fetch(`/api/hr/announcements/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/hr/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            if (!res.ok) throw new Error("Failed to save announcement");

            setFormData({ title: "", content: "", isGlobal: true, targetDepartmentId: "", type: "NEWS", eventDate: "", pollOptionsText: "", publishAt: "", expireAt: "" });
            setEditingId(null);
            setIsFormOpen(false);
            mutate();
            alert(editingId ? "✅ อัปเดตประกาศสำเร็จ" : "✅ ส่งประกาศสำเร็จ แจ้งเตือนพนักงานทุกคนเรียบร้อยแล้ว");
        } catch (error) {
            console.error(error);
            alert("❌ เกิดข้อผิดพลาดในการบันทึกประกาศ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (post: any) => {
        setFormData({
            title: post.title,
            content: post.content,
            isGlobal: post.isGlobal,
            targetDepartmentId: post.targetDepartmentId || "",
            type: post.type || "NEWS",
            eventDate: post.eventDate ? post.eventDate.substring(0, 16) : "",
            pollOptionsText: post.pollOptions ? post.pollOptions.join(', ') : "",
            publishAt: post.publishAt ? post.publishAt.substring(0, 16) : "",
            expireAt: post.expireAt ? post.expireAt.substring(0, 16) : ""
        });
        setEditingId(post.id);
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`คุณต้องการลบประกาศ "${title}" ใช่หรือไม่?การลบจะไม่สามารถกู้คืนได้`)) return;

        try {
            const res = await fetch(`/api/hr/announcements/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            mutate();
        } catch (e) {
            alert("เกิดข้อผิดพลาดในการลบประกาศ");
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold border-b-4 border-purple-500 pb-1 inline-block">ประกาศข่าวสารบริษัท</h1>
                    <p className="text-sm text-gray-500 mt-2">แจ้งเตือนข้อมูลสำคัญ หรือ ข่าวกิจการไปยังพนักงานทั้งหมด</p>
                </div>
                <button
                    onClick={() => {
                        setIsFormOpen(!isFormOpen);
                        if (!isFormOpen) { setEditingId(null); setFormData({ title: "", content: "", isGlobal: true, targetDepartmentId: "", type: "NEWS", eventDate: "", pollOptionsText: "", publishAt: "", expireAt: "" }); }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition shadow-sm"
                >
                    {isFormOpen ? "ยกเลิก" : "+ สร้างประกาศใหม่"}
                </button>
            </div>

            {isFormOpen && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อประกาศ <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-purple-500 focus:ring-purple-500"
                            placeholder="เช่น หยุดเทศกาลสงกรานต์, นโยบายเบิกค่าเดินทางใหม่..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เนื้อหา <span className="text-red-500">*</span></label>
                        <textarea
                            required
                            rows={3}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-purple-500 focus:ring-purple-500"
                            placeholder="พิมพ์รายละเอียดประกาศ..."
                        />
                    </div>

                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <label className="block text-sm font-bold text-purple-900 mb-3">ประเภทประกาศสื่อสาร</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {['NEWS', 'EVENT', 'POLL'].map(type => (
                                <label key={type} className={`cursor-pointer rounded-lg border p-3 flex items-center gap-2 transition-colors ${formData.type === type ? 'bg-purple-100 border-purple-400' : 'bg-white border-gray-200 hover:border-purple-300'}`}>
                                    <input type="radio" checked={formData.type === type} onChange={() => setFormData({ ...formData, type })} className="text-purple-600 focus:ring-purple-500 hidden" />
                                    <span className="text-xl">{type === 'NEWS' ? '🗞️' : type === 'EVENT' ? '📅' : '📊'}</span>
                                    <span className={`text-sm font-bold ${formData.type === type ? 'text-purple-800' : 'text-gray-600'}`}>
                                        {type === 'NEWS' ? 'ข่าวสารทั่วไป' : type === 'EVENT' ? 'เชิญร่วมกิจกรรม' : 'สร้างโพลสำรวจ'}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {formData.type === 'EVENT' && (
                            <div className="mt-4 bg-white p-3 rounded-lg border border-purple-100">
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่จัดกิจกรรม (Event Date)</label>
                                <input type="datetime-local" required className="text-sm border-gray-300 rounded-lg shadow-sm w-full md:w-auto" value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} />
                            </div>
                        )}

                        {formData.type === 'POLL' && (
                            <div className="mt-4 bg-white p-3 rounded-lg border border-purple-100">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ตัวเลือกของโพล (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
                                <input type="text" required placeholder="เช่น ใช่, ไม่ใช่, รับพิซซ่า, กินข้าวหมูทอด" className="w-full text-sm border-gray-300 rounded-lg shadow-sm" value={formData.pollOptionsText} onChange={e => setFormData({ ...formData, pollOptionsText: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <span className="text-sm font-bold tracking-wider text-purple-900 uppercase">กรอบเวลาการแสดงผลสื่อ (Schedule)</span>
                        <p className="text-xs text-gray-500 pb-2">หากปล่อยว่าง ประกาศจะแสดงผลทันทีและไม่หายไปจนกว่าจะลบเอง</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่มแชร์ (Publish At)</label>
                                <input type="datetime-local" className="text-sm border-gray-300 rounded-lg shadow-sm w-full" value={formData.publishAt} onChange={e => setFormData({ ...formData, publishAt: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เวลาลบอัตโนมัติ (Expire At)</label>
                                <input type="datetime-local" className="text-sm border-gray-300 rounded-lg shadow-sm w-full" value={formData.expireAt} onChange={e => setFormData({ ...formData, expireAt: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <span className="text-sm font-medium text-gray-700 block">กลุ่มเป้าหมาย</span>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.isGlobal}
                                    onChange={() => setFormData({ ...formData, isGlobal: true, targetDepartmentId: "" })}
                                    className="text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                                    <GlobeAsiaAustraliaIcon className="w-4 h-4 text-gray-400" />
                                    พนักงานทุกคน (Global)
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={!formData.isGlobal}
                                    onChange={() => setFormData({ ...formData, isGlobal: false })}
                                    className="text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                                    <UsersIcon className="w-4 h-4 text-gray-400" />
                                    เฉพาะแผนก
                                </span>
                            </label>
                        </div>

                        {!formData.isGlobal && (
                            <select
                                required
                                value={formData.targetDepartmentId}
                                onChange={(e) => setFormData({ ...formData, targetDepartmentId: e.target.value })}
                                className="mt-2 block w-full max-w-md text-sm border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                            >
                                <option value="">-- เลือกแผนก --</option>
                                {departments.map((dept: any) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <MegaphoneIcon className="w-4 h-4" />
                            {isSubmitting ? "กำลังบันทึก..." : (editingId ? "อัปเดตประกาศ" : "กระจายข่าว (Broadcast)")}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
                        ยังไม่มีประกาศกระดานข่าว
                    </div>
                ) : (
                    announcements.map((post: any) => (
                        <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        {post.type === 'EVENT' && '📅 '}
                                        {post.type === 'POLL' && '📊 '}
                                        {post.type === 'NEWS' && '🗞️ '}
                                        {post.title}
                                        {post.isGlobal ? (
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-full tracking-wider border border-blue-100">ทุกคน</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-bold uppercase rounded-full tracking-wider border border-pink-100">
                                                {post.department?.name || 'แผนก'}
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                                        <span className="font-medium text-purple-600">{post.author?.name || 'HR Admin'}</span>
                                        <span>•</span>
                                        <time>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: th })}</time>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(post)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-medium">✏️ แก้ไข</button>
                                    <button onClick={() => handleDelete(post.id, post.title)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-medium">🗑️ ลบ</button>
                                </div>
                            </div>
                            <div className="mt-4 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                {post.content}
                            </div>

                            {(post.publishAt || post.expireAt) && (
                                <div className="mt-3 flex gap-4 text-xs font-semibold text-gray-500 bg-gray-50 py-2 px-3 rounded-lg border border-gray-100 inline-flex">
                                    {post.publishAt && <span>🟢 เริ่ม: {new Date(post.publishAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>}
                                    {post.expireAt && <span>🔴 ซ่อน: {new Date(post.expireAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>}
                                </div>
                            )}

                            {post.type === 'EVENT' && post.eventDate && (
                                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-3 items-center">
                                    <div className="text-3xl bg-white p-2 rounded-lg shadow-sm">🗓️</div>
                                    <div>
                                        <div className="text-xs text-indigo-500 font-bold uppercase tracking-widest">กำหนดการจัดกิจกรรม</div>
                                        <div className="text-sm font-bold text-indigo-900">{new Date(post.eventDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</div>
                                    </div>
                                </div>
                            )}

                            {post.type === 'POLL' && post.pollOptions && (
                                <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-3">
                                    <div className="text-xs text-orange-600 font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><span className="text-lg">📈</span> ตัวเลือกโพลสำรวจ</div>
                                    <div className="flex flex-wrap gap-2">
                                        {(post.pollOptions as string[]).map((opt, i) => (
                                            <span key={i} className="bg-white px-3 py-1.5 rounded-lg text-sm font-medium border border-orange-200 text-orange-900 shadow-sm">{opt}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
