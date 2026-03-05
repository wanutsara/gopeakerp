'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { FlagIcon, ChartPieIcon, CheckBadgeIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function MyOKRsPage() {
    const { data: groupedOkrs, error, mutate } = useSWR('/api/ess/goals', fetcher);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleUpdateProgress = async (krId: string, currentVal: number, targetVal: number) => {
        const newValStr = prompt(`Update progress (Current: ${currentVal}, Target: ${targetVal}):`, currentVal.toString());
        if (newValStr === null) return;

        const newVal = Number(newValStr);
        if (isNaN(newVal) || newVal < 0) {
            alert("Invalid value.");
            return;
        }

        setUpdatingId(krId);
        try {
            const res = await fetch('/api/ess/goals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ krId, newValue: newVal }),
            });

            if (res.ok) {
                mutate();
                // Trigger generic gamification visual 
                alert(`Progress updated! You gained EXP for completing objectives.`);
            } else {
                alert('Failed to update progress.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred while updating.');
        } finally {
            setUpdatingId(null);
        }
    };

    if (error) return <div className="p-6 text-red-500">Failed to load My OKRs.</div>;
    if (!groupedOkrs) return <div className="p-6 font-bold text-gray-500 animate-pulse">Loading OKR aligner...</div>;
    if (groupedOkrs.error) return <div className="p-6 text-red-500 font-bold border-2 border-red-200 bg-red-50 rounded-xl m-6">System Error: {groupedOkrs.error}</div>;
    if (!Array.isArray(groupedOkrs)) return <div className="p-6 text-red-500">Data alignment error.</div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 drop-shadow-sm">
                        <FlagIcon className="w-10 h-10 text-rose-500" />
                        My OKRs (Objectives)
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Update your aligned Key Results and earn EXP globally.</p>
                </div>
            </div>

            <div className="space-y-8">
                {groupedOkrs.map((group: any) => {
                    const obj = group.objective;
                    const krs = group.keyResults;

                    return (
                        <div key={obj.id} className="bg-white rounded-3xl border border-rose-100 shadow-xl shadow-rose-100/30 overflow-hidden transform transition hover:-translate-y-1">
                            <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 border-b border-rose-100">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full tracking-widest uppercase">
                                        {obj.year} Q{obj.quarter}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                        <ChartPieIcon className="w-4 h-4" /> Company Objective
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{obj.title}</h2>
                                {obj.description && <p className="text-sm text-gray-600 font-medium">{obj.description}</p>}
                            </div>

                            <div className="p-6 space-y-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
                                    My Assigned Key Results (KPIs)
                                </h3>

                                {krs.map((kr: any) => {
                                    const progressPct = Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
                                    const isCompleted = progressPct >= 100;

                                    return (
                                        <div key={kr.id} className={`p-5 rounded-2xl border-2 transition ${isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-gray-900 text-sm md:text-base leading-snug max-w-[70%]">{kr.title}</h4>
                                                {isCompleted && <CheckBadgeIcon className="w-8 h-8 text-green-500 shrink-0" />}
                                            </div>

                                            <div className="flex items-end justify-between mb-2">
                                                <span className="font-black text-xl text-gray-900">
                                                    {kr.currentValue} <span className="text-gray-400 text-sm font-bold">/ {kr.targetValue} {kr.unit}</span>
                                                </span>
                                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${isCompleted ? 'bg-green-200 text-green-800' : 'bg-rose-100 text-rose-700'}`}>
                                                    {progressPct}%
                                                </span>
                                            </div>

                                            <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-3 rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`}
                                                    style={{ width: `${progressPct}%` }}
                                                ></div>
                                            </div>

                                            {!isCompleted && (
                                                <button
                                                    onClick={() => handleUpdateProgress(kr.id, kr.currentValue, kr.targetValue)}
                                                    disabled={updatingId === kr.id}
                                                    className="w-full mt-2 bg-white border-2 border-rose-100 hover:border-rose-400 hover:bg-rose-50 text-rose-600 font-bold py-2.5 px-4 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50"
                                                >
                                                    <ArrowTrendingUpIcon className="w-5 h-5" />
                                                    {updatingId === kr.id ? 'Updating...' : 'Log Progress (+EXP)'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {(!groupedOkrs || groupedOkrs.length === 0) && (
                    <div className="py-20 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <FlagIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-700">No OKRs Assigned</h3>
                        <p className="text-gray-500 font-medium">You currently don't have any Key Results mapped to your profile.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
