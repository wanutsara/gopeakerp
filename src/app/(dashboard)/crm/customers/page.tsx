'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UsersIcon, MapPinIcon, CurrencyDollarIcon, StarIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, GlobeAsiaAustraliaIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import CustomerDrawer from './CustomerDrawer';
import AudienceMap from './AudienceMap';

export default function CustomerDirectoryPage() {
    const router = useRouter();
    // Elegant Thai Phone Formatter
    const formatPhone = (phone: string | null) => {
        if (!phone) return null;
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        } else if (cleaned.startsWith('66') && cleaned.length === 11) {
            return '+' + cleaned.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '$1 $2-$3-$4');
        }
        return phone; // fallback if strange length
    };
    const [customers, setCustomers] = useState<any[]>([]);
    const [geoStats, setGeoStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Delete Confirmation State
    const [customerToDelete, setCustomerToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/crm/customers?q=${search}&province=${selectedProvince}`);
                const data = await res.json();
                if (data.success) {
                    setCustomers(data.customers);
                    // Only update province stats if no province is explicitly selected (so we can see full distribution)
                    if (!search && !selectedProvince) {
                        setGeoStats(data.geoStats);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchCustomers, 500);
        return () => clearTimeout(debounce);
    }, [search, selectedProvince, isDrawerOpen]); // Re-fetch on drawer close

    // Quick Stats Calculation
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const vipCount = customers.filter(c => (c.totalSpent || 0) > 1000).length;

    // Delete Logic
    const confirmDelete = (customer: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setCustomerToDelete(customer);
    };

    const handleDelete = async () => {
        if (!customerToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/crm/customers/${customerToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
                setCustomerToDelete(null);
            }
        } catch (err) {
            console.error('Failed to delete customer:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <UsersIcon className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2 rounded-xl" />
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">CRM Directory</h1>
                    </div>
                    <p className="text-gray-500 font-medium">
                        Omni-channel Customer Data Platform (CDP). Auto-enriched by Gemini via AI Sales Extraction.
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white border border-gray-200 rounded-2xl px-6 py-3 shadow-sm flex flex-col items-end justify-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Audience</span>
                        <span className="text-xl font-black text-indigo-900">{customers.length} <span className="text-sm font-medium text-gray-500">Profiles</span></span>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl px-6 py-3 shadow-lg flex flex-col items-end justify-center text-white">
                        <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Captured LTV</span>
                        <span className="text-xl font-black">฿{totalRevenue.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end -mt-4">
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Profile
                </button>
            </div>

            {/* Geographical Distribution Widget */}
            {geoStats.length > 0 && !selectedProvince && !search && (
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col gap-6 w-full relative z-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <GlobeAsiaAustraliaIcon className="w-6 h-6 text-fuchsia-500" />
                            Audience Geography Map
                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full ml-2 uppercase tracking-widest hidden md:inline-block">AI Spatial Engine</span>
                        </h3>
                    </div>

                    {/* Interactive Zoomable Map */}
                    <AudienceMap customers={customers} />

                    {/* Quick Filters */}
                    <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                        {geoStats.map((stat, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedProvince(stat.province)}
                                className="flex-shrink-0 bg-gray-50 border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 px-6 py-4 rounded-2xl transition-all text-left group min-w-[140px]"
                            >
                                <div className="text-2xl font-black text-indigo-600 mb-1 group-hover:scale-110 transition-transform origin-left">{stat._count.id}</div>
                                <div className="text-sm font-bold text-gray-700">{stat.province}</div>
                                <div className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">Customers</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Data Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by Name, Profile Name, Phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    {selectedProvince && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-indigo-800 bg-indigo-100 px-4 py-2 rounded-full flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4" /> Filtered: {selectedProvince}
                            </span>
                            <button
                                onClick={() => setSelectedProvince('')}
                                className="text-xs font-bold text-gray-500 hover:text-gray-900 underline"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Identity & Platform</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Location Segment</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Orders</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Lifetime Value (LTV)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
                                            <span className="font-bold">Syncing CDP Database...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center text-gray-400 font-medium">
                                        No customers found. Try dropping an export file into the Omni-Importer.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((c: any) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => router.push(`/crm/customers/${c.id}`)}
                                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-black text-lg shadow-sm border border-white">
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 text-base">{c.name}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                                            {c.source || 'UNKNOWN'}
                                                        </span>
                                                        {c.profileName && (
                                                            <span className="text-xs text-gray-500 font-medium truncate max-w-[150px]">
                                                                @{c.profileName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.phone ? (
                                                <span className="font-medium text-gray-700 font-mono tracking-wide">{formatPhone(c.phone)}</span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Unspecified</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-normal min-w-[200px] max-w-sm">
                                            <div className="flex flex-col">
                                                {c.province ? (
                                                    <>
                                                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                                            <MapPinIcon className="w-4 h-4 text-fuchsia-500" />
                                                            {c.province}
                                                        </span>
                                                        <span className="text-xs text-gray-700 mt-1 line-clamp-1" title={c.address}>
                                                            {c.address}
                                                        </span>
                                                        <span className="text-xs text-gray-500 mt-0.5">
                                                            {c.district && `${c.district},`} {c.subdistrict} {c.postalCode}
                                                        </span>
                                                    </>
                                                ) : c.address ? (
                                                    <span className="text-xs text-gray-600 line-clamp-2" title={c.address}>
                                                        {c.address}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                                                {c._count?.orders || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {c.totalSpent > 5000 && <StarIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                                                <span className={`font-black text-base ${c.totalSpent > 5000 ? 'text-indigo-600' : 'text-gray-900'}`}>
                                                    ฿{Number(c.totalSpent || 0).toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={(e) => confirmDelete(c, e)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                    title="ลบข้อมูลลูกค้า"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CustomerDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSaved={() => {
                    setIsDrawerOpen(false);
                    // The useEffect dependency will auto-trigger a re-fetch
                }}
            />

            {/* Delete Confirmation Modal */}
            {customerToDelete && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-gray-100">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto border-8 border-red-50/50">
                            <TrashIcon className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 text-center mb-2">ลบข้อมูลลูกค้านี้?</h3>
                        <p className="text-gray-500 text-center mb-8 font-medium leading-relaxed">
                            คุณแน่ใจหรือไม่ที่จะลบโปรไฟล์ของ <br />
                            <span className="font-bold text-gray-900 text-lg">"{customerToDelete.name}"</span><br />
                            <span className="text-sm mt-2 block opacity-80">ประวัติการสั่งซื้อและกระแสเงินสดจะยังคงอยู่ แต่โปรไฟล์ลูกค้านี้จะถูกซ่อนออกจากระบบแบบถาวร</span>
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setCustomerToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        กำลังลบ...
                                    </>
                                ) : (
                                    'ยืนยันลบทิ้ง'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
