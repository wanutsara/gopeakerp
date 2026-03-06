'use client';

import { useState, useEffect } from 'react';
import {
    BuildingOfficeIcon,
    MapPinIcon,
    StarIcon,
    PlusIcon,
    TruckIcon,
    BuildingStorefrontIcon,
    TrashIcon,
    PencilSquareIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

type LocationType = 'WAREHOUSE' | 'RETAIL' | 'TRANSIT';

interface Location {
    id: string;
    name: string;
    type: LocationType;
    address: string | null;
    isDefault: boolean;
    _count: { inventoryLevels: number };
}

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoc, setEditingLoc] = useState<Location | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'WAREHOUSE' as LocationType, address: '', isDefault: false });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/inventory/locations');
            const data = await res.json();
            if (data.success) {
                setLocations(data.locations);
            }
        } catch (error) {
            toast.error('Failed to load locations');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        if (type === 'RETAIL') return <BuildingStorefrontIcon className="w-8 h-8 text-pink-500" />;
        if (type === 'TRANSIT') return <TruckIcon className="w-8 h-8 text-amber-500" />;
        return <BuildingOfficeIcon className="w-8 h-8 text-blue-500" />;
    };

    const getColors = (type: string) => {
        if (type === 'RETAIL') return 'bg-pink-50 text-pink-700 ring-pink-500/20 shadow-pink-100';
        if (type === 'TRANSIT') return 'bg-amber-50 text-amber-700 ring-amber-500/20 shadow-amber-100';
        return 'bg-blue-50 text-blue-700 ring-blue-500/20 shadow-blue-100';
    };

    const handleOpenModal = (loc?: Location) => {
        if (loc) {
            setEditingLoc(loc);
            setFormData({ name: loc.name, type: loc.type, address: loc.address || '', isDefault: loc.isDefault });
        } else {
            setEditingLoc(null);
            setFormData({ name: '', type: 'WAREHOUSE', address: '', isDefault: locations.length === 0 });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const url = editingLoc ? `/api/inventory/locations/${editingLoc.id}` : '/api/inventory/locations';
            const method = editingLoc ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editingLoc ? 'Location updated' : 'Location created');
                setIsModalOpen(false);
                fetchLocations();
            } else {
                toast.error(data.error || 'Operation failed');
            }
        } catch (error) {
            toast.error('Server error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, isDefault: boolean) => {
        if (isDefault) {
            toast.error("Cannot delete the Default Warehouse. Please set another location as default first.");
            return;
        }
        if (!confirm('Are you sure you want to completely delete this location and permanently orphans its inventory records?')) return;

        try {
            const res = await fetch(`/api/inventory/locations/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Location deleted successfully');
                fetchLocations();
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error('Failed to delete location');
        }
    };

    if (loading) return <div className="p-8 space-y-4">
        <div className="h-10 w-48 bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-3xl"></div>)}
        </div>
    </div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                        Inventory Locations
                    </h1>
                    <p className="text-gray-500 mt-1">Manage physical warehouses, retail stores, and routing hubs.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all font-medium"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Location</span>
                </button>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map((loc) => (
                    <div
                        key={loc.id}
                        className={`relative group bg-white rounded-3xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${loc.isDefault ? 'border-amber-400/50 shadow-md shadow-amber-100 ring-1 ring-amber-400/20' : 'border-gray-100 shadow-sm hover:border-gray-300'
                            }`}
                    >
                        {loc.isDefault && (
                            <div className="absolute -top-3 -right-3 bg-gradient-to-tr from-amber-400 to-yellow-300 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-amber-200 flex items-center gap-1">
                                <StarSolidIcon className="w-3 h-3" />
                                Main Output
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-2xl ${getColors(loc.type)} shadow-sm`}>
                                {getIcon(loc.type)}
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(loc)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                    <PencilSquareIcon className="w-5 h-5" />
                                </button>
                                {!loc.isDefault && (
                                    <button onClick={() => handleDelete(loc.id, loc.isDefault)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{loc.name}</h3>
                            <div className="flex items-center gap-1.5 text-sm font-medium mt-1 text-gray-500">
                                <span className="uppercase tracking-wider text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{loc.type}</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-start gap-3 text-sm text-gray-600">
                                <MapPinIcon className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                <span className={!loc.address ? "italic text-gray-400" : ""}>{loc.address || 'No physical address configured.'}</span>
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-500">Active Products Matrix</span>
                                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                                    {loc._count.inventoryLevels} Linked
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">{editingLoc ? 'Edit Location' : 'New Physical Location'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Branch Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. BKK Fulfillment Center"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${formData.type === 'WAREHOUSE' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
                                    <input type="radio" className="peer sr-only" checked={formData.type === 'WAREHOUSE'} onChange={() => setFormData({ ...formData, type: 'WAREHOUSE' })} />
                                    <BuildingOfficeIcon className={`w-6 h-6 mb-2 ${formData.type === 'WAREHOUSE' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-bold ${formData.type === 'WAREHOUSE' ? 'text-blue-900' : 'text-gray-700'}`}>Warehouse</span>
                                </label>
                                <label className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${formData.type === 'RETAIL' ? 'border-pink-500 bg-pink-50/50 ring-1 ring-pink-500' : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'}`}>
                                    <input type="radio" className="peer sr-only" checked={formData.type === 'RETAIL'} onChange={() => setFormData({ ...formData, type: 'RETAIL' })} />
                                    <BuildingStorefrontIcon className={`w-6 h-6 mb-2 ${formData.type === 'RETAIL' ? 'text-pink-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-bold ${formData.type === 'RETAIL' ? 'text-pink-900' : 'text-gray-700'}`}>Retail POS</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Physical Address / Shipping Route</label>
                                <textarea
                                    rows={3}
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Full street address..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm resize-none"
                                />
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                                <div className="flex items-center h-5 mt-0.5">
                                    <input
                                        id="isDefault"
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                                    />
                                </div>
                                <label htmlFor="isDefault" className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-amber-900">Set as Master Output</span>
                                        <StarSolidIcon className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <p className="text-xs text-amber-700 mt-1">
                                        All new products and AI order deductions will automatically default to this branch unless specified. Only 1 branch can be Master Output.
                                    </p>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors shadow-lg shadow-blue-500/30">
                                    {isSaving ? 'Saving...' : (editingLoc ? 'Update Branch' : 'Deploy Branch')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
