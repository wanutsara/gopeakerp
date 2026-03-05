'use client';

import { useState, useEffect } from 'react';
import { ShieldExclamationIcon, CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function ResolutionCenterPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/crm/resolution');
            const data = await res.json();
            if (data.success) {
                setMatches(data.matches);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (matchId: string, action: 'MERGE' | 'REJECT') => {
        try {
            // Optimistic UI updates
            setMatches(prev => prev.filter(m => m.id !== matchId));

            const res = await fetch('/api/crm/resolution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, action })
            });
            const data = await res.json();
            if (!data.success) {
                // Revert if failed
                fetchMatches();
                alert(`Error: ${data.message || data.error}`);
            }
        } catch (err) {
            console.error(err);
            fetchMatches();
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium animate-pulse">Scanning identity matrices...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldExclamationIcon className="w-10 h-10 text-orange-600 bg-orange-50 p-2 rounded-xl" />
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Identity Resolution Center</h1>
                </div>
                <p className="text-gray-500 font-medium">
                    Omni-AI has detected {matches.length} incoming CDP profiles that share highly similar phonetic/textual structures to existing Golden Records.
                </p>
            </div>

            {/* Matches List */}
            {matches.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4 opacity-50" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Zero Conflicts Detected</h3>
                    <p className="text-gray-500 max-w-md">
                        The Customer Data Platform is perfectly synced. No fuzzy matches or duplicated identities require your manual authorization at this time.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {matches.map((match) => (
                        <div key={match.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                            {/* Confidence Score Header (Left Edge) */}
                            <div className="bg-gradient-to-b from-orange-50 to-orange-100/50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-orange-100 min-w-[200px]">
                                <ExclamationTriangleIcon className="w-8 h-8 text-orange-500 mb-2" />
                                <span className="text-xs font-bold text-orange-800 uppercase tracking-widest text-center mb-1">
                                    AI Match Confidence
                                </span>
                                <span className="text-4xl font-black text-orange-600">
                                    {Math.round(match.confidenceScore * 100)}<span className="text-2xl">%</span>
                                </span>
                            </div>

                            {/* Comparison Body */}
                            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                {/* Vertical Divider logic for desktop */}
                                <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gray-100 -translate-x-1/2" />

                                {/* Left Side: Original Golden Record */}
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                        Existing Database Record
                                    </span>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                                            {match.masterCustomer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 text-lg">{match.masterCustomer.name}</h3>
                                            <p className="text-sm font-medium text-gray-500 font-mono">{match.masterCustomer.phone || 'No Phone'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Total Lifetime Value:</span>
                                            <span className="font-bold">฿{Number(match.masterCustomer.totalSpent).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Historical Orders:</span>
                                            <span className="font-bold">{match.masterCustomer._count.orders}</span>
                                        </div>
                                        <div className="flex gap-2 items-start mt-2">
                                            <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                                            <span className="text-gray-700 text-xs">
                                                {match.masterCustomer.province || match.masterCustomer.address || 'Address unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Incoming Duplicate */}
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex justify-between">
                                        <span>Incoming Duplicate</span>
                                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px]">
                                            {match.duplicateCustomer.source || 'CSV IMPORT'}
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                                            {match.duplicateCustomer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 text-lg">{match.duplicateCustomer.name}</h3>
                                            {match.duplicateCustomer.profileName && (
                                                <p className="text-xs font-bold text-gray-400 mt-0.5">@{match.duplicateCustomer.profileName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm bg-orange-50/50 p-3 rounded-xl border border-orange-100 border-dashed">
                                        <div className="flex justify-between">
                                            <span className="text-orange-800/60 font-medium">Incoming Transaction:</span>
                                            <span className="font-bold text-orange-800">฿{Number(match.duplicateCustomer.totalSpent).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="bg-gray-50 p-6 flex flex-col md:flex-row items-center justify-end gap-3 border-t md:border-t-0 md:border-l border-gray-100 md:min-w-[200px]">
                                <button
                                    onClick={() => handleAction(match.id, 'REJECT')}
                                    className="w-full md:w-auto px-4 py-2.5 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 text-gray-700 text-sm font-bold rounded-xl transition-all flex justify-center items-center gap-2"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleAction(match.id, 'MERGE')}
                                    className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-b from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white shadow-md text-sm font-bold rounded-xl transition-all flex justify-center items-center gap-2"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Merge
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
