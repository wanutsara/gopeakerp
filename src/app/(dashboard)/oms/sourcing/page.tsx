'use client';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useBrand } from '@/context/BrandContext';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    Squares2X2Icon,
    TableCellsIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import SourcingKanban, { SourcingItemData } from './SourcingKanban';
import SourcingTable from './SourcingTable';
import SourcingModal from './SourcingModal';
import SourcingSettingsModal from './SourcingSettingsModal';
import DropReasonModal from './DropReasonModal';
import { SourcingConfigData, DEFAULT_SOURCING_CONFIG } from '@/lib/sourcingCost';
import { toast } from 'react-hot-toast';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Fetch failed');
    }
    return res.json();
};

export default function SourcingPipelinePage() {
    const { activeBrandId } = useBrand();

    // UI state
    const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
    const [searchTerm, setSearchTerm] = useState('');
    const [platformFilter, setPlatformFilter] = useState('ALL');
    const [stageFilter, setStageFilter] = useState('ALL');

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SourcingItemData | null>(null);
    const [droppingItem, setDroppingItem] = useState<SourcingItemData | null>(null);

    // Fetch backend cost settings
    const settingsUrl = useMemo(() => {
        return `/api/oms/sourcing/settings${activeBrandId ? `?brandId=${activeBrandId}` : ''}`;
    }, [activeBrandId]);

    const { data: backendConfig, mutate: mutateConfig } = useSWR<SourcingConfigData>(
        settingsUrl,
        fetcher
    );

    const activeConfig = backendConfig || DEFAULT_SOURCING_CONFIG;

    // Build API query URL for items
    const apiUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (activeBrandId) params.set('brandId', activeBrandId);
        if (platformFilter !== 'ALL') params.set('platform', platformFilter);
        if (stageFilter !== 'ALL') params.set('stage', stageFilter);
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        const qs = params.toString();
        return `/api/oms/sourcing${qs ? `?${qs}` : ''}`;
    }, [activeBrandId, platformFilter, stageFilter, searchTerm]);

    const { data: items = [], isLoading, mutate } = useSWR<SourcingItemData[]>(apiUrl, fetcher, {
        revalidateOnFocus: true
    });

    // KPI Metrics calculation
    const kpis = useMemo(() => {
        const total = items.length;
        const inCostReview = items.filter(i => i.stage === 'COST_REVIEW').length;
        const inSample = items.filter(i => i.stage === 'SAMPLE_TESTING').length;
        const approved = items.filter(i => i.stage === 'APPROVED').length;
        const dropped = items.filter(i => i.stage === 'DROPPED').length;

        const activeItems = items.filter(i => i.stage !== 'DROPPED');
        const avgMargin = activeItems.length > 0
            ? activeItems.reduce((acc, i) => acc + (i.estMarginPercent || 0), 0) / activeItems.length
            : 0;

        const highMarginCount = activeItems.filter(i => (i.estMarginPercent || 0) >= 40).length;

        return {
            total,
            inCostReview,
            inSample,
            approved,
            dropped,
            avgMargin,
            highMarginCount
        };
    }, [items]);

    // Delete item handler
    const handleDeleteItem = async (id: string) => {
        try {
            const res = await fetch(`/api/oms/sourcing/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            toast.success('ลบสินค้าออกจากไปป์ไลน์แล้ว');
            mutate();
        } catch (err: any) {
            toast.error(err.message || 'ลบไม่สำเร็จ');
        }
    };

    // Convert to Product handler
    const handleConvertItem = async (item: SourcingItemData) => {
        try {
            const res = await fetch(`/api/oms/sourcing/${item.id}/convert`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Conversion failed');

            toast.success(`🎉 แปลงเป็นสินค้าสำเร็จ! รหัส SKU: ${data.product?.sku}`);
            mutate();
        } catch (err: any) {
            toast.error(err.message || 'แปลงเป็นสินค้าไม่สำเร็จ');
            throw err;
        }
    };

    // Stage change from Table or Drag
    const handleStageChange = async (item: SourcingItemData, newStage: string) => {
        if (newStage === 'DROPPED' && item.stage !== 'DROPPED') {
            setDroppingItem(item);
            return;
        }

        try {
            const res = await fetch(`/api/oms/sourcing/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage })
            });
            if (!res.ok) throw new Error('Failed to update stage');
            toast.success('อัปเดตขั้นตอนแล้ว');
            mutate();
        } catch {
            toast.error('อัปเดตขั้นตอนไม่สำเร็จ');
        }
    };

    // Drop reason confirmation
    const handleConfirmDrop = async (reason: string) => {
        if (!droppingItem) return;

        try {
            const res = await fetch(`/api/oms/sourcing/${droppingItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stage: 'DROPPED',
                    dropReason: reason
                })
            });

            if (!res.ok) throw new Error('Failed to update drop reason');
            toast.success('บันทึกการปัดตกและระบุเหตุผลเรียบร้อย');
            setDroppingItem(null);
            mutate();
        } catch {
            toast.error('บันทึกไม่สำเร็จ');
        }
    };

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-16">
            {/* Header & Main Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/25">
                        🎯
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">
                                ค้นหาสินค้า & ไปป์ไลน์ (Sourcing Pipeline)
                            </h1>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Pre-order Multi-Channel Costing
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                            เปรียบเทียบต้นทุนขนส่งทุกช่องทาง (ส่งรถ / ส่งเรือ / ส่งแอร์) และคำนวณจากเรทต้นทุนจริงหลังบ้านอัตโนมัติ
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => mutate()}
                        className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-colors border border-gray-200"
                        title="รีเฟรชข้อมูล"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-sm transition-all hover:scale-[1.02]"
                    >
                        <Cog6ToothIcon className="w-4 h-4 text-indigo-300" />
                        <span>ตั้งค่าเรทขนส่ง & ต้นทุนหลังบ้าน</span>
                    </button>

                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
                    >
                        <PlusIcon className="w-4 h-4 stroke-[3]" />
                        <span>เพิ่มสินค้าพรีออเดอร์ใหม่</span>
                    </button>
                </div>
            </div>

            {/* Active Backend Cost Rates Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-black text-[11px]">
                        ⚙️ เรทต้นทุนหลังบ้านปัจจุบัน
                    </span>
                    <span className="text-slate-300 text-[11px]">
                        (ใช้คำนวณทุกสินค้าอัตโนมัติ)
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-[11px]">
                    <div>
                        <span className="text-slate-400">เรทเงิน: </span>
                        <strong className="text-white">¥1 = ฿{activeConfig.rmbExchangeRate}</strong>
                        <span className="mx-1 text-slate-600">|</span>
                        <strong className="text-white">$1 = ฿{activeConfig.usdExchangeRate}</strong>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/30 text-sky-200">
                        🚛 ส่งรถ: <strong>฿{activeConfig.truckRatePerKg}/กก.</strong> • <strong>฿{activeConfig.truckRatePerCbm.toLocaleString()}/คิว</strong>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-400/30 text-teal-200">
                        🚢 ส่งเรือ: <strong>฿{activeConfig.seaRatePerKg}/กก.</strong> • <strong>฿{activeConfig.seaRatePerCbm.toLocaleString()}/คิว</strong>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-400/30 text-violet-200">
                        ✈️ ส่งแอร์: <strong>฿{activeConfig.airRatePerKg}/กก.</strong>
                    </div>

                    <div className="text-slate-300">
                        📦 กล่อง <strong>฿{activeConfig.defaultPackagingCost}</strong> + ส่งไทย <strong>฿{activeConfig.defaultLocalShippingCost}</strong> | แอด <strong>฿{activeConfig.defaultAdSpendPerUnit}</strong> | คอม <strong>{activeConfig.defaultPlatformFeePercent}%</strong>
                    </div>
                </div>

                <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                    แก้ไขเรทต้นทุน ➔
                </button>
            </div>

            {/* Top KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">สินค้าทั้งหมด</span>
                        <span className="text-base">📦</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900">{kpis.total}</span>
                        <span className="text-xs text-gray-400 font-semibold">รายการ</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-purple-600">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">กำลังตรวจต้นทุน</span>
                        <span className="text-base">🧮</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-purple-900">{kpis.inCostReview}</span>
                        <span className="text-xs text-purple-400 font-semibold">รายการ</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-amber-600">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">สั่งตัวอย่างทดลอง</span>
                        <span className="text-base">🔬</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-amber-900">{kpis.inSample}</span>
                        <span className="text-xs text-amber-400 font-semibold">รายการ</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-emerald-600">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">อนุมัติพร้อมเปิดพรี</span>
                        <span className="text-base">✅</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-900">{kpis.approved}</span>
                        <span className="text-xs text-emerald-500 font-semibold">พร้อมขาย</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-gray-900 to-slate-900 text-white p-4 rounded-3xl shadow-md">
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">มาร์จิ้นเฉลี่ย</span>
                        <span className="text-base">🚀</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{kpis.avgMargin.toFixed(1)}%</span>
                        <span className="text-[10px] text-gray-400 font-medium">({kpis.highMarginCount} รายการ &gt;40%)</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar & View Toggle */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2.5 flex-1 flex-wrap">
                    <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาชื่อสินค้า, ซัพพลายเออร์, หรือบันทึก..."
                            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900"
                        />
                    </div>

                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                        {['ALL', '1688', 'AMAZON', 'TAOBAO', 'ALIBABA'].map((plat) => (
                            <button
                                key={plat}
                                onClick={() => setPlatformFilter(plat)}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                    platformFilter === plat
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {plat === 'ALL' ? 'ทั้งหมด' : plat}
                            </button>
                        ))}
                    </div>

                    <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer"
                    >
                        <option value="ALL">ทุกขั้นตอน (All Stages)</option>
                        <option value="IDEA">💡 ไอเดียใหม่</option>
                        <option value="COST_REVIEW">🧮 ตรวจสอบต้นทุน</option>
                        <option value="SAMPLE_TESTING">🔬 รอสั่งตัวอย่าง</option>
                        <option value="APPROVED">✅ อนุมัติพร้อมเปิดพรี</option>
                        <option value="DROPPED">❌ ปัดตก/ไม่เอา</option>
                    </select>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-end lg:self-auto text-xs font-bold">
                    <button
                        onClick={() => setViewMode('KANBAN')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            viewMode === 'KANBAN'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Squares2X2Icon className="w-4 h-4" />
                        <span>ไปป์ไลน์ (Kanban)</span>
                    </button>
                    <button
                        onClick={() => setViewMode('TABLE')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            viewMode === 'TABLE'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <TableCellsIcon className="w-4 h-4" />
                        <span>ตารางเปรียบเทียบทุกต้นทุน (Table)</span>
                    </button>
                </div>
            </div>

            {/* Main Views Container */}
            {isLoading && items.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <div className="inline-block animate-spin text-3xl mb-3">⚙️</div>
                    <p className="text-sm font-bold text-gray-700">กำลังโหลดข้อมูลสินค้าในไปป์ไลน์...</p>
                </div>
            ) : viewMode === 'KANBAN' ? (
                <SourcingKanban
                    items={items}
                    onItemsChange={(updated) => mutate(updated, false)}
                    onEditItem={(item) => {
                        setEditingItem(item);
                        setIsAddModalOpen(true);
                    }}
                    onDeleteItem={handleDeleteItem}
                    onConvertItem={handleConvertItem}
                    onRequestDropReason={(item) => setDroppingItem(item)}
                />
            ) : (
                <SourcingTable
                    items={items}
                    onEditItem={(item) => {
                        setEditingItem(item);
                        setIsAddModalOpen(true);
                    }}
                    onDeleteItem={handleDeleteItem}
                    onConvertItem={handleConvertItem}
                    onStageChange={handleStageChange}
                />
            )}

            {/* Modals */}
            <SourcingModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                }}
                onSaved={() => mutate()}
                initialData={editingItem}
                brandId={activeBrandId}
                backendConfig={activeConfig}
                onOpenSettings={() => {
                    setIsAddModalOpen(false);
                    setIsSettingsModalOpen(true);
                }}
            />

            <SourcingSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                initialConfig={activeConfig}
                brandId={activeBrandId}
                onSaved={(newConfig) => {
                    mutateConfig(newConfig, false);
                    mutate();
                }}
            />

            <DropReasonModal
                isOpen={Boolean(droppingItem)}
                itemName={droppingItem?.title || ''}
                onClose={() => setDroppingItem(null)}
                onConfirm={handleConfirmDrop}
            />
        </div>
    );
}
