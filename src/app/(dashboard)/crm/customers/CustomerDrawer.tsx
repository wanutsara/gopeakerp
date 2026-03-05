'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, MapPinIcon, IdentificationIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface CustomerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    customerData?: any; // null if creating
    onSaved: () => void;
}

// Thai Address Raw Database (Mocked MVP structure, usually fetched from a heavy JSON or API)
// For MVP, we will rely on users typing, but give them a structured form.
// In production, integration with 'thai-address-database' npm is superior.
export default function CustomerDrawer({ isOpen, onClose, customerData, onSaved }: CustomerDrawerProps) {
    const isEdit = !!customerData;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [source, setSource] = useState('MANUAL');
    const [address, setAddress] = useState('');
    const [province, setProvince] = useState('');
    const [district, setDistrict] = useState('');
    const [subdistrict, setSubdistrict] = useState('');
    const [postalCode, setPostalCode] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (isEdit && customerData) {
                setName(customerData.name || '');
                setPhone(customerData.phone || '');
                setSource(customerData.source || 'MANUAL');
                setAddress(customerData.address || '');
                setProvince(customerData.province || '');
                setDistrict(customerData.district || '');
                setSubdistrict(customerData.subdistrict || '');
                setPostalCode(customerData.postalCode || '');
            } else {
                setName('');
                setPhone('');
                setSource('MANUAL');
                setAddress('');
                setProvince('');
                setDistrict('');
                setSubdistrict('');
                setPostalCode('');
            }
        }
    }, [isOpen, customerData, isEdit]);

    // Simulated Auto-complete stub: if postal code is typed, auto-fill if known.
    // In a real app we'd load JQuery Thai Address or similar standard hook.
    const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPostalCode(val);
        // Extremely simple MVP heuristic, e.g. 10230 -> BKK, 20000 -> Chonburi
        if (val === '10230') {
            setProvince('กรุงเทพมหานคร');
            setDistrict('เขตลาดพร้าว');
            setSubdistrict('แขวงจรเข้บัว');
        } else if (val === '20000') {
            setProvince('ชลบุรี');
            setDistrict('เมืองชลบุรี');
        } else if (val === '50000') {
            setProvince('เชียงใหม่');
            setDistrict('เมืองเชียงใหม่');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const url = isEdit ? `/api/crm/customers/${customerData.id}` : `/api/crm/customers`;
            const method = isEdit ? 'PUT' : 'POST';

            const payload = {
                name,
                phone: phone.trim() || null,
                source,
                address: address.trim() || null,
                province: province.trim() || null,
                district: district.trim() || null,
                subdistrict: subdistrict.trim() || null,
                postalCode: postalCode.trim() || null,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to save customer');

            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <IdentificationIcon className="w-6 h-6 text-indigo-600" />
                            {isEdit ? 'Edit Customer Profile' : 'New Customer Profile'}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            {isEdit ? `Update CRM record for ${customerData.name}` : 'Manually inject a Golden Record into the CDP'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-200">
                            {error}
                        </div>
                    )}

                    <form id="customer-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1: Vital Identity */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                                <UserIcon className="w-4 h-4" /> Identity Protocol
                            </h3>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Customer Full Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all focus:border-indigo-500"
                                    placeholder="e.g. John Smith"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                        placeholder="08X-XXX-XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Platform Source</label>
                                    <select
                                        value={source}
                                        onChange={e => setSource(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-black text-gray-700 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    >
                                        <option value="MANUAL">MANUAL (Storefront)</option>
                                        <option value="SHOPEE">SHOPEE</option>
                                        <option value="LAZADA">LAZADA</option>
                                        <option value="TIKTOK">TIKTOK</option>
                                        <option value="LINESHOPPING">LINE SHOPPING</option>
                                        <option value="FACEBOOK">FACEBOOK</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Logistics / Geographical */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-xs font-black text-fuchsia-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                                <MapPinIcon className="w-4 h-4" /> Logistics Node
                            </h3>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Street Address (Haus, Soi, Road)</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all"
                                    placeholder="House No, Building, Street..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Postal Code (ZIP)</label>
                                    <input
                                        type="text"
                                        value={postalCode}
                                        onChange={handlePostalCodeChange}
                                        className="w-full border border-fuchsia-200 bg-fuchsia-50/50 rounded-xl px-4 py-3 text-sm font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all"
                                        placeholder="Type ZIP..."
                                    />
                                    <p className="text-[10px] font-bold text-fuchsia-600 mt-1 pl-1">Autofills region geography ↓</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Subdistrict (แขวง/ตำบล)</label>
                                    <input
                                        type="text"
                                        value={subdistrict}
                                        onChange={e => setSubdistrict(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">District (เขต/อำเภอ)</label>
                                    <input
                                        type="text"
                                        value={district}
                                        onChange={e => setDistrict(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Province (จังหวัด)</label>
                                    <input
                                        type="text"
                                        value={province}
                                        onChange={e => setProvince(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
                    <button
                        type="submit"
                        form="customer-form"
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isEdit ? 'Commit Profile Updates' : 'Generate New Customer Record'}
                    </button>
                </div>
            </div>
        </div>
    );
}
