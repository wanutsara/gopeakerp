"use client";

import { useBrand } from '@/context/BrandContext';
import { useState, useRef, useEffect } from 'react';

export default function GlobalBrandSelector() {
    const { activeBrandId, setActiveBrandId, brands, isLoading } = useBrand();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (isLoading) return <div className="animate-pulse w-32 h-8 bg-gray-100 rounded-full"></div>;
    if (!brands || brands.length === 0) return null;

    const activeBrand = activeBrandId ? brands.find(b => b.id === activeBrandId) : null;

    return (
        <div className="relative mr-4" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 text-white rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
            >
                <span className="flex items-center justify-center w-5 h-5 bg-white/20 rounded-full text-xs">
                    {activeBrand ? (activeBrand.isHQ ? '🏢' : '🏪') : '🌍'}
                </span>
                {activeBrand ? activeBrand.name : 'Consolidated HQ (All)'}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Corporate Entity</span>
                    </div>

                    <button
                        onClick={() => { setActiveBrandId(null); setIsOpen(false); }}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-indigo-50 transition-colors ${!activeBrandId ? 'bg-indigo-50/50' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">🌍</span>
                            <div>
                                <span className="block text-sm font-bold text-gray-900">Consolidated HQ View</span>
                                <span className="block text-xs text-gray-500">All Brands & Entities Combined</span>
                            </div>
                        </div>
                        {!activeBrandId && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                    </button>

                    <div className="border-t border-gray-100"></div>

                    {brands.map(brand => (
                        <button
                            key={brand.id}
                            onClick={() => { setActiveBrandId(brand.id); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-emerald-50 transition-colors ${activeBrandId === brand.id ? 'bg-emerald-50/50' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{brand.isHQ ? '🏢' : '🏪'}</span>
                                <div>
                                    <span className="block text-sm font-bold text-gray-900">{brand.name}</span>
                                    <span className="block text-xs text-gray-500">Isolated Subsidiary View</span>
                                </div>
                            </div>
                            {activeBrandId === brand.id && <div className="w-2 h-2 rounded-full bg-emerald-600"></div>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
