'use client';
import { useState, useEffect } from 'react';
import {
    XMarkIcon,
    Cog6ToothIcon,
    TruckIcon,
    CurrencyDollarIcon,
    CubeIcon,
    ArrowPathIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { SourcingConfigData, DEFAULT_SOURCING_CONFIG } from '@/lib/sourcingCost';
import { toast } from 'react-hot-toast';

interface SourcingSettingsModalProps {
    isOpen: boolean;
    onClose?: () => void;
    onSaved: (newConfig: SourcingConfigData) => void;
    initialConfig?: SourcingConfigData | null;
    brandId?: string | null;
    asPage?: boolean;
}

export default function SourcingSettingsModal({
    isOpen,
    onClose,
    onSaved,
    initialConfig,
    brandId,
    asPage = false
}: SourcingSettingsModalProps) {
    const [form, setForm] = useState<SourcingConfigData>(DEFAULT_SOURCING_CONFIG);
    const [recalculateAll, setRecalculateAll] = useState(true);
    const [overwriteItemLocalCosts, setOverwriteItemLocalCosts] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialConfig) {
            setForm({
                ...DEFAULT_SOURCING_CONFIG,
                ...initialConfig
            });
        }
    }, [initialConfig, isOpen]);

    if (!isOpen && !asPage) return null;

    const handleChange = (key: keyof SourcingConfigData, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/oms/sourcing/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    companyBrandId: brandId || null,
                    recalculateAll,
                    overwriteItemLocalCosts
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save settings');

            if (recalculateAll && data.updatedCount > 0) {
                toast.success(`บันทึกตั้งค่าหลังบ้าน & คำนวณต้นทุนสินค้าใหม่ ${data.updatedCount} รายการเรียบร้อย!`);
            } else {
                toast.success('บันทึกการตั้งค่าต้นทุนหลังบ้านเรียบร้อย!');
            }

            onSaved(data.config);
            if (onClose && !asPage) onClose();
        } catch (err: any) {
            toast.error(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
        } finally {
            setIsSaving(false);
        }
    };

    const content = (
        <div className={asPage ? "bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" : "w-full max-w-4xl my-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]"}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                        <Cog6ToothIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-black tracking-tight">
                            ตั้งค่าเรทขนส่ง & ต้นทุนจริงหลังบ้าน (Backend Cost Engine)
                        </h2>
                        <p className="text-xs text-slate-300">
                            กำหนดต้นทุนจริงของทางรถ ทางเรือ ทางแอร์ เรทเงิน และค่าใช้จ่ายมาตรฐานเพื่อใช้คำนวณทั้งระบบ
                        </p>
                    </div>
                </div>
                {!asPage && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                {/* 1. Exchange Rates */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                            <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
                            1. อัตราแลกเปลี่ยนเงินตรามาตรฐาน (Exchange Rates)
                        </h3>
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                            ใช้แปลงค่าของและค่าส่งในต่างประเทศ
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-red-50/40 border border-red-100 rounded-2xl">
                            <label className="block text-xs font-black text-gray-800 mb-1">
                                🇨🇳 เรทเงินหยวนจีน (RMB ➔ THB)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.rmbExchangeRate}
                                    onChange={(e) => handleChange('rmbExchangeRate', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900"
                                />
                                <span className="text-xs font-bold text-gray-500 shrink-0">บาท / ¥1</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">สำหรับสินค้าจาก 1688, Taobao, Tmall</p>
                        </div>

                        <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-2xl">
                            <label className="block text-xs font-black text-gray-800 mb-1">
                                🇺🇸 เรทเงินดอลลาร์สหรัฐ (USD ➔ THB)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.usdExchangeRate}
                                    onChange={(e) => handleChange('usdExchangeRate', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900"
                                />
                                <span className="text-xs font-bold text-gray-500 shrink-0">บาท / $1</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">สำหรับสินค้าจาก Amazon, Alibaba Global</p>
                        </div>
                    </div>
                </div>

                {/* 2. Multi-Channel Freight Rates */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                            <TruckIcon className="w-5 h-5 text-emerald-600" />
                            2. ต้นทุนค่าขนส่งนำเข้าแยกตามช่องทาง (ส่งรถ / ส่งเรือ / ส่งแอร์)
                        </h3>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            แสดงเปรียบเทียบทั้ง 3 ช่องทางพร้อมกันในทุกสินค้า
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Truck Channel */}
                        <div className="p-4 rounded-2xl bg-sky-50/60 border-2 border-sky-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                                    🚛 ขนส่งทางรถ (Land/Truck)
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-200/70 text-sky-900 rounded-full">
                                    ยอดนิยม
                                </span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    เรทส่งรถ ต่อกิโลกรัม (฿/kg)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={form.truckRatePerKg}
                                    onChange={(e) => handleChange('truckRatePerKg', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-sky-200 rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    เรทส่งรถ ต่อคิวบิกเมตร (฿/CBM)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={form.truckRatePerCbm}
                                    onChange={(e) => handleChange('truckRatePerCbm', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-sky-200 rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    ระยะเวลาขนส่งโดยประมาณ
                                </label>
                                <input
                                    type="text"
                                    value={form.truckLeadTime}
                                    onChange={(e) => handleChange('truckLeadTime', e.target.value)}
                                    placeholder="เช่น 5-7 วัน"
                                    className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-sky-200 rounded-xl text-gray-700"
                                />
                            </div>
                        </div>

                        {/* Sea Channel */}
                        <div className="p-4 rounded-2xl bg-teal-50/60 border-2 border-teal-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                                    🚢 ขนส่งทางเรือ (Sea Freight)
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-200/70 text-teal-900 rounded-full">
                                    ประหยัดสุด
                                </span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    เรทส่งเรือ ต่อกิโลกรัม (฿/kg)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={form.seaRatePerKg}
                                    onChange={(e) => handleChange('seaRatePerKg', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-teal-200 rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    เรทส่งเรือ ต่อคิวบิกเมตร (฿/CBM)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={form.seaRatePerCbm}
                                    onChange={(e) => handleChange('seaRatePerCbm', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-teal-200 rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    ระยะเวลาขนส่งโดยประมาณ
                                </label>
                                <input
                                    type="text"
                                    value={form.seaLeadTime}
                                    onChange={(e) => handleChange('seaLeadTime', e.target.value)}
                                    placeholder="เช่น 14-20 วัน"
                                    className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-teal-200 rounded-xl text-gray-700"
                                />
                            </div>
                        </div>

                        {/* Air Channel */}
                        <div className="p-4 rounded-2xl bg-violet-50/60 border-2 border-violet-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-violet-950 flex items-center gap-1.5">
                                    ✈️ ขนส่งทางแอร์ (Air Freight)
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-200/70 text-violet-900 rounded-full">
                                    ด่วนพิเศษ
                                </span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    เรทส่งแอร์ ต่อกิโลกรัม (฿/kg)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={form.airRatePerKg}
                                    onChange={(e) => handleChange('airRatePerKg', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-violet-200 rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    เรทส่งแอร์ ต่อคิวบิกเมตร (฿/CBM)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={form.airRatePerCbm}
                                    onChange={(e) => handleChange('airRatePerCbm', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-black bg-white border border-violet-200 rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    ระยะเวลาขนส่งโดยประมาณ
                                </label>
                                <input
                                    type="text"
                                    value={form.airLeadTime}
                                    onChange={(e) => handleChange('airLeadTime', e.target.value)}
                                    placeholder="เช่น 3-5 วัน"
                                    className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-violet-200 rounded-xl text-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Default Local Fulfillment & Marketing Costs */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                            <CubeIcon className="w-5 h-5 text-amber-600" />
                            3. ต้นทุนการจัดการในไทย & การตลาดมาตรฐาน (Local & Platform Defaults)
                        </h3>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                            ค่าเริ่มต้นเมื่อเพิ่มสินค้าใหม่
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                ค่ากล่อง/แพ็คเกจจิ้ง (฿/ชิ้น)
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={form.defaultPackagingCost}
                                onChange={(e) => handleChange('defaultPackagingCost', e.target.value)}
                                className="w-full px-3 py-2 text-sm font-black bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                ค่าส่งลูกค้าในไทย (฿/ชิ้น)
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={form.defaultLocalShippingCost}
                                onChange={(e) => handleChange('defaultLocalShippingCost', e.target.value)}
                                className="w-full px-3 py-2 text-sm font-black bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                ค่าธรรมเนียมแพลตฟอร์ม (%)
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={form.defaultPlatformFeePercent}
                                onChange={(e) => handleChange('defaultPlatformFeePercent', e.target.value)}
                                className="w-full px-3 py-2 text-sm font-black bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                งบยิงแอดต่อชิ้น (฿/ชิ้น)
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={form.defaultAdSpendPerUnit}
                                onChange={(e) => handleChange('defaultAdSpendPerUnit', e.target.value)}
                                className="w-full px-3 py-2 text-sm font-black bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                ภาษี/เคลียร์ริ่งเหมา (฿/ชิ้น)
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={form.defaultImportDutyRate}
                                onChange={(e) => handleChange('defaultImportDutyRate', e.target.value)}
                                className="w-full px-3 py-2 text-sm font-black bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Bulk Recalculation Options */}
                <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200 space-y-2.5">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={recalculateAll}
                            onChange={(e) => setRecalculateAll(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                            <span className="text-xs font-black text-indigo-950 block">
                                🔄 คำนวณต้นทุนสินค้าที่มีอยู่ในไปป์ไลน์ใหม่ทั้งหมดด้วยเรทเงินและเรทขนส่ง (รถ/เรือ/แอร์) ล่าสุดนี้ทันที
                            </span>
                            <span className="text-[11px] text-indigo-700">
                                เมื่อติ๊กถูก สินค้าทุกรายการในบอร์ดจะถูกอัปเดตค่าส่งรถ ส่งเรือ ส่งแอร์ และกำไรสุทธิใหม่ตามเรทหลังบ้านนี้โดยอัตโนมัติ
                            </span>
                        </div>
                    </label>

                    {recalculateAll && (
                        <label className="flex items-start gap-3 cursor-pointer pl-7 pt-1">
                            <input
                                type="checkbox"
                                checked={overwriteItemLocalCosts}
                                onChange={(e) => setOverwriteItemLocalCosts(e.target.checked)}
                                className="mt-0.5 w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] font-bold text-indigo-900">
                                📦 อัปเดตทับค่ากล่อง ค่าส่งในไทย ค่าคอมแพลตฟอร์ม% และงบแอดของสินค้าเดิมทุกตัวด้วย
                            </span>
                        </label>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    {!asPage && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            ยกเลิก
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                <span>กำลังบันทึกและคำนวณต้นทุนใหม่...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>บันทึกตั้งค่าต้นทุนหลังบ้าน</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );

    if (asPage) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            {content}
        </div>
    );
}
