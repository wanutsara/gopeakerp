'use client';
import { useState } from 'react';
import { SourcingItemData } from './SourcingKanban';
import { calculateLandedCost } from '@/lib/sourcingCost';
import {
    ArrowTopRightOnSquareIcon,
    PencilSquareIcon,
    TrashIcon,
    SparklesIcon,
    CheckBadgeIcon,
    PhotoIcon,
    ArrowsUpDownIcon
} from '@heroicons/react/24/outline';

interface SourcingTableProps {
    items: SourcingItemData[];
    onEditItem: (item: SourcingItemData) => void;
    onDeleteItem: (id: string) => void;
    onConvertItem: (item: SourcingItemData) => void;
    onStageChange: (item: SourcingItemData, newStage: string) => void;
}

const STAGES = [
    { id: 'IDEA', label: '💡 1. ไอเดียใหม่' },
    { id: 'COST_REVIEW', label: '🧮 2. ตรวจสอบต้นทุน' },
    { id: 'SAMPLE_TESTING', label: '🔬 3. รอสั่งตัวอย่าง' },
    { id: 'APPROVED', label: '✅ 4. อนุมัติพร้อมเปิดพรี' },
    { id: 'DROPPED', label: '❌ 5. ปัดตก/ไม่เอา' }
];

export default function SourcingTable({
    items,
    onEditItem,
    onDeleteItem,
    onConvertItem,
    onStageChange
}: SourcingTableProps) {
    const [sortField, setSortField] = useState<'createdAt' | 'landedCostTHB' | 'targetSellingPrice' | 'estMarginPercent'>('createdAt');
    const [sortAsc, setSortAsc] = useState<boolean>(false);
    const [convertingId, setConvertingId] = useState<string | null>(null);

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    const sortedItems = [...items].sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'createdAt') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    const handleConvert = async (e: React.MouseEvent, item: SourcingItemData) => {
        e.stopPropagation();
        setConvertingId(item.id);
        try {
            await onConvertItem(item);
        } finally {
            setConvertingId(null);
        }
    };

    const getPlatformBadge = (platform: string) => {
        switch (platform) {
            case '1688':
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-orange-100 text-orange-700 border border-orange-200">1688</span>;
            case 'AMAZON':
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-100 text-amber-800 border border-amber-200">Amazon</span>;
            case 'TAOBAO':
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-red-100 text-red-700 border border-red-200">Taobao</span>;
            case 'ALIBABA':
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-600 text-white">Alibaba</span>;
            default:
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-700">{platform}</span>;
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                            <th className="py-3.5 px-4">สินค้า & น้ำหนัก/คิว</th>
                            <th className="py-3.5 px-3">ค่าของต้นทาง</th>
                            <th className="py-3.5 px-3 bg-sky-50/60 text-sky-900">🚛 ส่งทางรถ (Truck)</th>
                            <th className="py-3.5 px-3 bg-teal-50/60 text-teal-900">🚢 ส่งทางเรือ (Sea)</th>
                            <th className="py-3.5 px-3 bg-violet-50/60 text-violet-900">✈️ ส่งทางแอร์ (Air)</th>
                            <th className="py-3.5 px-3">แพ็ค+ส่งไทย / แอด+คอม</th>
                            <th
                                className="py-3.5 px-3 cursor-pointer hover:text-gray-900 transition-colors"
                                onClick={() => handleSort('targetSellingPrice')}
                            >
                                <div className="flex items-center gap-1">
                                    <span>ราคาขายปลีก</span>
                                    <ArrowsUpDownIcon className="w-3.5 h-3.5" />
                                </div>
                            </th>
                            <th className="py-3.5 px-3">ขั้นตอนไปป์ไลน์</th>
                            <th className="py-3.5 px-3">สถานะคลัง</th>
                            <th className="py-3.5 px-4 text-right">จัดการ</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {sortedItems.map((item) => {
                            const calc = calculateLandedCost(item);
                            const currSym = item.foreignCurrency === 'USD' ? '$' : item.foreignCurrency === 'RMB' ? '¥' : '฿';
                            const sel = calc.selectedChannel;

                            return (
                                <tr
                                    key={item.id}
                                    onClick={() => onEditItem(item)}
                                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                                >
                                    {/* Thumbnail + Title + Specs */}
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 shrink-0 overflow-hidden">
                                                {item.imageUrl && !/detail\.1688\.com\/offer\//i.test(item.imageUrl) ? (
                                                    <img src={item.imageUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <PhotoIcon className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 max-w-[220px]">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    {getPlatformBadge(item.sourcePlatform)}
                                                    {item.sourceUrl && (
                                                        <a
                                                            href={item.sourceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                                            title="เปิดลิงก์สินค้า"
                                                        >
                                                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                    {item.title}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    ⚖️ {item.weightKg || 0} kg | 📦 {calc.computedCbm || 0} CBM
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Foreign Base Cost */}
                                    <td className="py-3 px-3">
                                        <span className="font-mono text-xs font-black text-gray-900 block">
                                            ฿{calc.foreignBaseTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            ({currSym}{item.foreignPrice} @{item.exchangeRate})
                                        </span>
                                        {calc.domesticShippingTHB > 0 && (
                                            <span className="text-[10px] text-gray-500 block">
                                                +ส่งตปท. ฿{calc.domesticShippingTHB.toFixed(0)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Truck Breakdown */}
                                    <td className={`py-3 px-3 ${sel === 'TRUCK' ? 'bg-sky-50/70 ring-1 ring-inset ring-sky-200' : 'bg-sky-50/20'}`}>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">ค่าส่งรถ:</span>
                                            <strong className="text-sky-800">฿{calc.channels.truck.shippingTHB.toFixed(1)}</strong>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">ทุนรวม:</span>
                                            <span className="font-bold text-gray-900">฿{calc.channels.truck.totalCostTHB.toFixed(0)}</span>
                                        </div>
                                        <div className="mt-0.5 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400">กำไร:</span>
                                            <span className={`text-[11px] font-black ${calc.channels.truck.profitTHB >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {calc.channels.truck.profitTHB >= 0 ? '+' : ''}฿{calc.channels.truck.profitTHB.toFixed(0)} ({calc.channels.truck.marginPercent.toFixed(0)}%)
                                            </span>
                                        </div>
                                    </td>

                                    {/* Sea Breakdown */}
                                    <td className={`py-3 px-3 ${sel === 'SEA' ? 'bg-teal-50/70 ring-1 ring-inset ring-teal-200' : 'bg-teal-50/20'}`}>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">ค่าส่งเรือ:</span>
                                            <strong className="text-teal-800">฿{calc.channels.sea.shippingTHB.toFixed(1)}</strong>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">ทุนรวม:</span>
                                            <span className="font-bold text-gray-900">฿{calc.channels.sea.totalCostTHB.toFixed(0)}</span>
                                        </div>
                                        <div className="mt-0.5 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400">กำไร:</span>
                                            <span className={`text-[11px] font-black ${calc.channels.sea.profitTHB >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {calc.channels.sea.profitTHB >= 0 ? '+' : ''}฿{calc.channels.sea.profitTHB.toFixed(0)} ({calc.channels.sea.marginPercent.toFixed(0)}%)
                                            </span>
                                        </div>
                                    </td>

                                    {/* Air Breakdown */}
                                    <td className={`py-3 px-3 ${sel === 'AIR' ? 'bg-violet-50/70 ring-1 ring-inset ring-violet-200' : 'bg-violet-50/20'}`}>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">ค่าส่งแอร์:</span>
                                            <strong className="text-violet-800">฿{calc.channels.air.shippingTHB.toFixed(1)}</strong>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">ทุนรวม:</span>
                                            <span className="font-bold text-gray-900">฿{calc.channels.air.totalCostTHB.toFixed(0)}</span>
                                        </div>
                                        <div className="mt-0.5 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400">กำไร:</span>
                                            <span className={`text-[11px] font-black ${calc.channels.air.profitTHB >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {calc.channels.air.profitTHB >= 0 ? '+' : ''}฿{calc.channels.air.profitTHB.toFixed(0)} ({calc.channels.air.marginPercent.toFixed(0)}%)
                                            </span>
                                        </div>
                                    </td>

                                    {/* Local & Marketing Breakdown + ROAS */}
                                    <td className="py-3 px-3 text-[11px]">
                                        <div className="text-gray-700">
                                            📦 แพ็ค+ส่งไทย: <strong>฿{calc.localFulfillmentTHB.toFixed(0)}</strong>
                                        </div>
                                        <div className="text-gray-500">
                                            📢 แอด+คอม: <strong>฿{(calc.marketingTHB + calc.platformFeeTHB).toFixed(0)}</strong>
                                        </div>
                                        <div className="mt-0.5 text-[10px] font-black text-indigo-700">
                                            🎯 ROAS คุ้มทุน: {calc.breakEvenRoas > 0 ? `> ${calc.breakEvenRoas.toFixed(2)}x` : 'ขาดทุน'}
                                        </div>
                                    </td>

                                    {/* Target Selling Price & Target ROAS */}
                                    <td className="py-3 px-3">
                                        <div className="font-black text-blue-600 text-sm">
                                            ฿{item.targetSellingPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                                        </div>
                                        <div className="text-[10px] font-bold text-amber-700">
                                            เป้า ROAS ≥ {calc.targetRoas > 0 ? `${calc.targetRoas.toFixed(1)}x` : '-'}
                                        </div>
                                    </td>

                                    {/* Stage Selector */}
                                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            value={item.stage}
                                            onChange={(e) => onStageChange(item, e.target.value)}
                                            className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 cursor-pointer"
                                        >
                                            {STAGES.map((s) => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))}
                                        </select>
                                        {item.stage === 'DROPPED' && item.dropReason && (
                                            <p className="text-[10px] text-rose-600 mt-1 line-clamp-1 max-w-[140px]">
                                                ⚠️ {item.dropReason}
                                            </p>
                                        )}
                                    </td>

                                    {/* Converted Product Status */}
                                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                        {item.convertedProductId ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                                <CheckBadgeIcon className="w-3.5 h-3.5" />
                                                {item.convertedProduct?.sku || 'Converted'}
                                            </span>
                                        ) : item.stage === 'APPROVED' ? (
                                            <button
                                                type="button"
                                                onClick={(e) => handleConvert(e, item)}
                                                disabled={convertingId === item.id}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all hover:scale-105 disabled:opacity-50"
                                            >
                                                <SparklesIcon className="w-3.5 h-3.5" />
                                                <span>{convertingId === item.id ? 'กำลังสร้าง...' : 'แปลงลงคลัง'}</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-gray-400">-</span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onEditItem(item)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="แก้ไข/เปิดเครื่องคิดเลข"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (confirm(`ยืนยันการลบ "${item.title}"?`)) {
                                                        onDeleteItem(item.id);
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="ลบ"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {sortedItems.length === 0 && (
                            <tr>
                                <td colSpan={10} className="py-12 text-center text-gray-400 text-xs">
                                    ไม่พบรายการสินค้าตามเงื่อนไขที่เลือก
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
