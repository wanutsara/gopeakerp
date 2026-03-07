"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Edit2, Trash2, Camera, UploadCloud, Landmark, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface CompanyBrand {
    id: string;
    name: string;
    isHQ: boolean;
    taxId: string | null;
    branchCode: string | null;
    legalName: string | null;
    registeredAddress: string | null;
    logoUrl: string | null;
}

export default function CorporateIdentityManager() {
    const [brands, setBrands] = useState<CompanyBrand[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<CompanyBrand | null>(null);
    const [formData, setFormData] = useState<Partial<CompanyBrand>>({ isHQ: false });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/settings/brands');
            if (res.ok) {
                const data = await res.json();
                setBrands(data);
            }
        } catch (error) {
            console.error("Failed to fetch brands", error);
        }
        setIsLoading(false);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data,
            });
            const result = await res.json();
            if (result.url) {
                setFormData(prev => ({ ...prev, logoUrl: result.url }));
            }
        } catch (error) {
            console.error('Upload failed', error);
            alert("อัปโหลดรูปล้มเหลว โปรดลองอีกครั้ง");
        }
        setIsUploading(false);
    };

    const handleOpenModal = (brand?: CompanyBrand) => {
        if (brand) {
            setEditingBrand(brand);
            setFormData({ ...brand });
        } else {
            setEditingBrand(null);
            setFormData({ isHQ: false });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingBrand
                ? `/api/settings/brands/${editingBrand.id}`
                : '/api/settings/brands';
            const method = editingBrand ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                await fetchBrands();
                setIsModalOpen(false);
            } else {
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`คุณต้องการลบแบรนด์ ${name} ใช่หรือไม่?\nการกระทำนี้จะลบข้อมูลที่เกี่ยวข้องด้วย`)) {
            try {
                const res = await fetch(`/api/settings/brands/${id}`, { method: 'DELETE' });
                if (res.ok) fetchBrands();
            } catch (error) {
                alert("ลบข้อมูลไม่สำเร็จ");
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Corporate Identity</h1>
                    <p className="text-gray-500 mt-1">จัดการข้อมูลนิติบุคคล แบรนด์ โลโก้ และเลขภาษี สำหรับพิมพ์ลงสลิปทางการ</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg hover:shadow-indigo-500/30"
                >
                    <Plus className="w-5 h-5" /> เพิ่มนิติบุคคล
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            ) : brands.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">ยังไม่มีรายชื่อบริษัท หรือแบรนด์</h3>
                    <p className="text-gray-500 mt-2">เพิ่มข้อมูลตึก/สาขา เพื่อให้ระบบ Payroll ไปดึงสลิปเงินเดือนได้ถูกต้อง</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {brands.map((brand, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={brand.id}
                            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>

                            <div className="flex justify-between items-start mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center p-2 overflow-hidden">
                                    {brand.logoUrl ? (
                                        <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <Building2 className="w-8 h-8 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(brand)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {!brand.isHQ && (
                                        <button onClick={() => handleDelete(brand.id, brand.name)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-800 break-words">{brand.name}</h3>
                                {brand.isHQ && (
                                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                        <CheckCircle2 className="w-3 h-3" /> สำนักงานใหญ่ (HQ)
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-start gap-3">
                                    <Landmark className="w-5 h-5 text-gray-400 shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">ชื่อนิติบุคคล</p>
                                        <p className="text-sm text-gray-700 font-medium">{brand.legalName || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-gray-500 uppercase">เลขผู้เสียภาษี / สาขา</p>
                                        <div className="flex justify-between items-center w-full">
                                            <p className="text-sm text-gray-700 font-medium">{brand.taxId || '-'}</p>
                                            {brand.branchCode && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">สาขา: {brand.branchCode}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        ></motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl z-10 overflow-hidden"
                        >
                            <div className="p-8">
                                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                    {editingBrand ? 'แก้ไขข้อมูลบริษัทย่อย' : 'เพิ่มนิติบุคคล / แบรนด์ใหม่'}
                                </h2>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Logo Upload */}
                                    <div className="flex flex-col items-center mb-8">
                                        <div
                                            onClick={handleUploadClick}
                                            className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all overflow-hidden relative group"
                                        >
                                            {formData.logoUrl ? (
                                                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <div className="text-center">
                                                    <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                                                    <span className="text-xs text-gray-500 mt-1 block">อัปโหลด</span>
                                                </div>
                                            )}

                                            {isUploading && (
                                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                                                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <UploadCloud className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <p className="text-xs text-gray-400 mt-3 text-center">อัปโหลดโลโก้บริษัท (PNG รูปแบบตรายางโปร่งใสเพื่อให้แนบสลิปสวยงาม)</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อแบรนด์ / ร้านค้า (แสดงผลในแอป)</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.name || ''}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white"
                                                placeholder="เช่น Tamaya, Same Same หรือ Head Office"
                                            />
                                        </div>

                                        <div className="md:col-span-2 border-t border-gray-100 pt-5 mt-2">
                                            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                                                <Landmark className="w-4 h-4 text-indigo-600" /> ข้อมูลสำหรับจดทะเบียนและภาษี
                                            </h4>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อนิติบุคคล / ชื่อบริษัทจดทะเบียน (Legal Name)</label>
                                            <input
                                                type="text"
                                                value={formData.legalName || ''}
                                                onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white"
                                                placeholder="เช่น บริษัท เอสซีจี เมนเทนแนนซ์ จำกัด"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                                            <input
                                                type="text"
                                                value={formData.taxId || ''}
                                                onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white font-mono"
                                                placeholder="01055xxxxxxxx"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสสาขาบริษัท (Branch Code)</label>
                                            <input
                                                type="text"
                                                value={formData.branchCode || ''}
                                                onChange={e => setFormData({ ...formData, branchCode: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white font-mono"
                                                placeholder="00000 (สำนักงานใหญ่)"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่จดทะเบียนบริษัท (Registered Address)</label>
                                            <textarea
                                                rows={2}
                                                value={formData.registeredAddress || ''}
                                                onChange={e => setFormData({ ...formData, registeredAddress: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white resize-none"
                                                placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                                            />
                                            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> ข้อมูลนี้จะตายตัวและถูกพิมพ์ลงบนหัวมุมซ้ายบนสลิปเงินเดือน 50 ทวิเสมอ
                                            </p>
                                        </div>

                                        <div className="md:col-span-2 pt-2">
                                            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isHQ || false}
                                                    onChange={e => setFormData({ ...formData, isHQ: e.target.checked })}
                                                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-800">นี่คือสำนักงานใหญ่ (Headquarters)</p>
                                                    <p className="text-xs text-gray-500">บัญชีค่าใช้จ่ายพนักงานส่วนกลางทั้งหมด (Shared Services) จะถูกโอนมารวมกันที่นี่อัตโนมัติ</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!formData.name}
                                            className="bg-indigo-600 disabled:bg-indigo-300 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-medium transition-colors"
                                        >
                                            บันทึกข้อมูล
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
