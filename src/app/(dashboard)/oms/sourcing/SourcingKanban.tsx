'use client';
import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
    ArrowTopRightOnSquareIcon,
    PencilSquareIcon,
    TrashIcon,
    SparklesIcon,
    CheckBadgeIcon,
    ExclamationCircleIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import { calculateLandedCost } from '@/lib/sourcingCost';
import { toast } from 'react-hot-toast';

export interface SourcingItemData {
    id: string;
    title: string;
    sourceUrl?: string | null;
    sourcePlatform: string;
    imageUrl?: string | null;
    category?: string | null;
    supplierName?: string | null;
    supplierContact?: string | null;
    notes?: string | null;
    stage: string;
    dropReason?: string | null;
    priority: string;
    orderIndex: number;
    foreignCurrency: string;
    foreignPrice: number;
    foreignDomesticShipping?: number;
    exchangeRate: number;
    shippingMethod?: string;
    selectedChannel?: string;
    weightKg?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    cbm?: number;
    shippingRatePerKg?: number;
    shippingRatePerCbm?: number;
    truckRatePerKg?: number;
    truckRatePerCbm?: number;
    seaRatePerKg?: number;
    seaRatePerCbm?: number;
    airRatePerKg?: number;
    airRatePerCbm?: number;
    importDutyRate?: number;
    packagingCost?: number;
    localShippingCost?: number;
    platformFeePercent?: number;
    adSpendPerUnit?: number;
    shippingTruckTHB?: number;
    landedCostTruckTHB?: number;
    totalCostTruckTHB?: number;
    profitTruckTHB?: number;
    marginTruckPercent?: number;
    shippingSeaTHB?: number;
    landedCostSeaTHB?: number;
    totalCostSeaTHB?: number;
    profitSeaTHB?: number;
    marginSeaPercent?: number;
    shippingAirTHB?: number;
    landedCostAirTHB?: number;
    totalCostAirTHB?: number;
    profitAirTHB?: number;
    marginAirPercent?: number;
    landedCostTHB: number;
    totalCostTHB: number;
    targetSellingPrice: number;
    estProfitPerUnit: number;
    estMarginPercent: number;
    breakevenPrice?: number;
    convertedProductId?: string | null;
    convertedProduct?: { id: string; name: string; sku: string | null } | null;
    createdAt: string;
}

interface SourcingKanbanProps {
    items: SourcingItemData[];
    onItemsChange: (items: SourcingItemData[]) => void;
    onEditItem: (item: SourcingItemData) => void;
    onDeleteItem: (id: string) => void;
    onConvertItem: (item: SourcingItemData) => void;
    onRequestDropReason: (item: SourcingItemData) => void;
}

const COLUMNS = [
    {
        id: 'IDEA',
        title: '1. ไอเดียใหม่',
        subtitle: 'พบสินค้าที่น่าสนใจ',
        icon: '💡',
        color: 'border-blue-300',
        bg: 'bg-blue-50/70',
        badge: 'bg-blue-100 text-blue-800'
    },
    {
        id: 'COST_REVIEW',
        title: '2. ตรวจสอบต้นทุน',
        subtitle: 'กำลังคำนวณกำไร/เช็คราคา',
        icon: '🧮',
        color: 'border-purple-300',
        bg: 'bg-purple-50/70',
        badge: 'bg-purple-100 text-purple-800'
    },
    {
        id: 'SAMPLE_TESTING',
        title: '3. รอสั่งตัวอย่าง',
        subtitle: 'สั่งตรวจสเปก/คุณภาพงาน',
        icon: '🔬',
        color: 'border-amber-300',
        bg: 'bg-amber-50/70',
        badge: 'bg-amber-100 text-amber-800'
    },
    {
        id: 'APPROVED',
        title: '4. อนุมัติพร้อมเปิดพรี',
        subtitle: 'ผ่านเกณฑ์ พร้อมยิงแอด/ขาย',
        icon: '✅',
        color: 'border-emerald-300',
        bg: 'bg-emerald-50/70',
        badge: 'bg-emerald-100 text-emerald-800'
    },
    {
        id: 'DROPPED',
        title: '5. ปัดตก/ไม่เอา',
        subtitle: 'ไม่ผ่านเกณฑ์ พร้อมระบุเหตุผล',
        icon: '❌',
        color: 'border-rose-300',
        bg: 'bg-rose-50/70',
        badge: 'bg-rose-100 text-rose-800'
    }
];

export default function SourcingKanban({
    items,
    onItemsChange,
    onEditItem,
    onDeleteItem,
    onConvertItem,
    onRequestDropReason
}: SourcingKanbanProps) {
    const [convertingId, setConvertingId] = useState<string | null>(null);

    const onDragEnd = useCallback(async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const draggedItem = items.find(i => i.id === draggableId);
        if (!draggedItem) return;

        const targetStage = destination.droppableId;

        if (targetStage === 'DROPPED' && draggedItem.stage !== 'DROPPED') {
            onRequestDropReason(draggedItem);
            return;
        }

        const updatedItems = items.map(item => {
            if (item.id === draggableId) {
                return { ...item, stage: targetStage, orderIndex: destination.index };
            }
            return item;
        });

        onItemsChange(updatedItems);

        try {
            const res = await fetch(`/api/oms/sourcing/${draggableId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stage: targetStage,
                    orderIndex: destination.index
                })
            });

            if (!res.ok) throw new Error('Update stage failed');
        } catch {
            toast.error('ไม่สามารถอัปเดตสเตตัสบนเซิร์ฟเวอร์ได้');
            onItemsChange(items);
        }
    }, [items, onItemsChange, onRequestDropReason]);

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
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-600 text-white border border-amber-700">Alibaba</span>;
            default:
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-200">{platform}</span>;
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 items-start min-h-[650px]">
                {COLUMNS.map((col) => {
                    const colItems = items
                        .filter(item => item.stage === col.id)
                        .sort((a, b) => a.orderIndex - b.orderIndex);

                    return (
                        <div
                            key={col.id}
                            className={`w-80 sm:w-[340px] shrink-0 flex flex-col rounded-3xl ${col.bg} border-2 ${col.color} shadow-sm overflow-hidden`}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3.5 bg-white/70 border-b border-gray-200/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{col.icon}</span>
                                    <div>
                                        <h3 className="text-xs font-black text-gray-900 tracking-tight">{col.title}</h3>
                                        <p className="text-[10px] text-gray-500 font-medium">{col.subtitle}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black shadow-sm ${col.badge}`}>
                                    {colItems.length}
                                </span>
                            </div>

                            {/* Droppable Area */}
                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 p-3 space-y-3 min-h-[500px] transition-colors ${
                                            snapshot.isDraggingOver ? 'bg-white/40 ring-2 ring-blue-400 ring-inset rounded-2xl' : ''
                                        }`}
                                    >
                                        {colItems.map((item, index) => {
                                            const calc = calculateLandedCost(item);
                                            const currSym = item.foreignCurrency === 'USD' ? '$' : item.foreignCurrency === 'RMB' ? '¥' : '฿';
                                            const selectedCh = calc.selectedChannel;

                                            return (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(dragProvided, dragSnapshot) => (
                                                        <div
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            {...dragProvided.dragHandleProps}
                                                            onClick={() => onEditItem(item)}
                                                            className={`bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                                                                dragSnapshot.isDragging ? 'shadow-2xl scale-[1.02] rotate-1 ring-2 ring-blue-500 z-50' : ''
                                                            }`}
                                                        >
                                                            {/* Top Row: Thumbnail + Title */}
                                                            <div className="flex gap-3 items-start">
                                                                <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 shrink-0 overflow-hidden relative">
                                                                    {item.imageUrl ? (
                                                                        <img
                                                                            src={item.imageUrl}
                                                                            alt={item.title}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                            <PhotoIcon className="w-6 h-6" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                                        {getPlatformBadge(item.sourcePlatform)}
                                                                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                                                            ขาย ฿{item.targetSellingPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                                                        {item.title}
                                                                    </h4>
                                                                </div>
                                                            </div>

                                                            {/* Itemized Base Costs Summary Pill */}
                                                            <div className="mt-2.5 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-1 text-[10px] font-semibold text-gray-600">
                                                                <span>
                                                                    ค่าของ {currSym}{item.foreignPrice} (฿{calc.foreignBaseTHB.toFixed(0)})
                                                                </span>
                                                                <span>•</span>
                                                                <span>แพ็ค+ส่งไทย ฿{calc.localFulfillmentTHB.toFixed(0)}</span>
                                                                <span>•</span>
                                                                <span>แอด+คอม ฿{(calc.marketingTHB + calc.platformFeeTHB).toFixed(0)}</span>
                                                            </div>

                                                            {/* Multi-Channel Freight Breakdown (Truck / Sea / Air) */}
                                                            <div className="mt-2 space-y-1 text-[10px]">
                                                                {/* Truck Row */}
                                                                <div className={`flex items-center justify-between px-2 py-1 rounded-lg border ${
                                                                    selectedCh === 'TRUCK'
                                                                        ? 'bg-sky-50 border-sky-300 font-bold text-sky-950'
                                                                        : 'bg-gray-50/60 border-gray-100 text-gray-600'
                                                                }`}>
                                                                    <span className="flex items-center gap-1">
                                                                        <span>🚛 ส่งรถ:</span>
                                                                        <strong className="text-sky-700">฿{calc.channels.truck.shippingTHB.toFixed(0)}</strong>
                                                                    </span>
                                                                    <span>ทุนรวม ฿{calc.channels.truck.totalCostTHB.toFixed(0)}</span>
                                                                    <span className={calc.channels.truck.profitTHB >= 0 ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>
                                                                        {calc.channels.truck.profitTHB >= 0 ? '+' : ''}฿{calc.channels.truck.profitTHB.toFixed(0)} ({calc.channels.truck.marginPercent.toFixed(0)}%)
                                                                    </span>
                                                                </div>

                                                                {/* Sea Row */}
                                                                <div className={`flex items-center justify-between px-2 py-1 rounded-lg border ${
                                                                    selectedCh === 'SEA'
                                                                        ? 'bg-teal-50 border-teal-300 font-bold text-teal-950'
                                                                        : 'bg-gray-50/60 border-gray-100 text-gray-600'
                                                                }`}>
                                                                    <span className="flex items-center gap-1">
                                                                        <span>🚢 ส่งเรือ:</span>
                                                                        <strong className="text-teal-700">฿{calc.channels.sea.shippingTHB.toFixed(0)}</strong>
                                                                    </span>
                                                                    <span>ทุนรวม ฿{calc.channels.sea.totalCostTHB.toFixed(0)}</span>
                                                                    <span className={calc.channels.sea.profitTHB >= 0 ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>
                                                                        {calc.channels.sea.profitTHB >= 0 ? '+' : ''}฿{calc.channels.sea.profitTHB.toFixed(0)} ({calc.channels.sea.marginPercent.toFixed(0)}%)
                                                                    </span>
                                                                </div>

                                                                {/* Air Row */}
                                                                <div className={`flex items-center justify-between px-2 py-1 rounded-lg border ${
                                                                    selectedCh === 'AIR'
                                                                        ? 'bg-violet-50 border-violet-300 font-bold text-violet-950'
                                                                        : 'bg-gray-50/60 border-gray-100 text-gray-600'
                                                                }`}>
                                                                    <span className="flex items-center gap-1">
                                                                        <span>✈️ ส่งแอร์:</span>
                                                                        <strong className="text-violet-700">฿{calc.channels.air.shippingTHB.toFixed(0)}</strong>
                                                                    </span>
                                                                    <span>ทุนรวม ฿{calc.channels.air.totalCostTHB.toFixed(0)}</span>
                                                                    <span className={calc.channels.air.profitTHB >= 0 ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>
                                                                        {calc.channels.air.profitTHB >= 0 ? '+' : ''}฿{calc.channels.air.profitTHB.toFixed(0)} ({calc.channels.air.marginPercent.toFixed(0)}%)
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Drop Reason Note if Dropped */}
                                                            {col.id === 'DROPPED' && item.dropReason && (
                                                                <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-[10px] text-rose-700 flex items-start gap-1.5 font-medium">
                                                                    <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                                                    <span className="line-clamp-2">{item.dropReason}</span>
                                                                </div>
                                                            )}

                                                            {/* Convert to Product Action (Only in APPROVED column) */}
                                                            {col.id === 'APPROVED' && (
                                                                <div className="mt-3 pt-2 border-t border-gray-100">
                                                                    {item.convertedProductId ? (
                                                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-[10px] font-bold border border-emerald-200/60">
                                                                            <CheckBadgeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                            <span className="truncate">แปลงลงคลังแล้ว ({item.convertedProduct?.sku || 'SKU'})</span>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => handleConvert(e, item)}
                                                                            disabled={convertingId === item.id}
                                                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                                                                        >
                                                                            <SparklesIcon className="w-3.5 h-3.5" />
                                                                            <span>{convertingId === item.id ? 'กำลังสร้างสินค้า...' : '🚀 แปลงเป็นสินค้าในคลัง'}</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Card Footer Actions */}
                                                            <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-gray-400 text-xs">
                                                                {item.sourceUrl ? (
                                                                    <a
                                                                        href={item.sourceUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="hover:text-blue-600 flex items-center gap-1 transition-colors text-[10px]"
                                                                        title="เปิดหน้าเว็บต้นทาง"
                                                                    >
                                                                        <span>เปิดเว็บ</span>
                                                                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {item.weightKg || 0} kg | {calc.computedCbm || 0} CBM
                                                                    </span>
                                                                )}

                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onEditItem(item);
                                                                        }}
                                                                        className="hover:text-blue-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                                                        title="แก้ไขข้อมูล"
                                                                    >
                                                                        <PencilSquareIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm(`ยืนยันการลบ "${item.title}" ออกจากไปป์ไลน์?`)) {
                                                                                onDeleteItem(item.id);
                                                                            }
                                                                        }}
                                                                        className="hover:text-rose-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                                                        title="ลบ"
                                                                    >
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}

                                        {colItems.length === 0 && (
                                            <div className="py-12 text-center text-gray-400 text-xs border-2 border-dashed border-gray-200/80 rounded-2xl">
                                                ลากสินค้ามาวางที่นี่
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}
