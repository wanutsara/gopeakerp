'use client';
import { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DropReasonModalProps {
    isOpen: boolean;
    itemName: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

const COMMON_REASONS = [
    "ต้นทุนสูงเกินไป / กำไรน้อย (Low Margin)",
    "ค่าขนส่งนำเข้าแพง (ของหนักหรือชิ้นใหญ่)",
    "คู่แข่งในไทยตัดราคาหนัก (Price War)",
    "ซัพพลายเออร์รีวิวแย่ / คะแนนต่ำ",
    "สินค้าแตกหักง่าย / เคลมบ่อย",
    "ติดปัญหาลิขสิทธิ์ / ใบอนุญาตนำเข้า (FDA/TISI)",
    "ขั้นต่ำในการสั่งซื้อสูงเกินไป (High MOQ)",
    "คุณภาพตัวอย่างไม่ผ่านเกณฑ์"
];

export default function DropReasonModal({
    isOpen,
    itemName,
    onClose,
    onConfirm
}: DropReasonModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalReason = customReason.trim() || selectedReason || "ไม่ระบุเหตุผล";
        onConfirm(finalReason);
        setSelectedReason('');
        setCustomReason('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-rose-50/80 border-b border-rose-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-lg">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-rose-900">ระบุเหตุผลที่ปัดตก (Drop Reason)</h3>
                            <p className="text-xs text-rose-700/80 line-clamp-1 font-medium">{itemName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100/50 rounded-xl transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            เลือกเหตุผลหลักที่ตัดสินใจไม่เอา
                        </label>
                        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {COMMON_REASONS.map((reason) => {
                                const isSelected = selectedReason === reason && !customReason;
                                return (
                                    <button
                                        type="button"
                                        key={reason}
                                        onClick={() => {
                                            setSelectedReason(reason);
                                            setCustomReason('');
                                        }}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                            isSelected
                                                ? "bg-rose-600 text-white shadow-sm"
                                                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60"
                                        }`}
                                    >
                                        <span>{reason}</span>
                                        {isSelected && <span className="text-xs">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            หรือระบุเหตุผลเพิ่มเติมด้วยตนเอง
                        </label>
                        <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="พิมพ์รายละเอียดเพิ่มเติม เช่น รอซัพพลายเออร์ปรับราคา, เช็คตัวอย่างแล้วงานไม่เนียน..."
                            rows={2}
                            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-gray-900"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02]"
                        >
                            ยืนยันการปัดตก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
