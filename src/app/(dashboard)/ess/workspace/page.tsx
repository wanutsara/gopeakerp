'use client';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
    SparklesIcon,
    FireIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    CalendarDaysIcon,
    ExclamationCircleIcon,
    PlayIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import KanbanBoard from './KanbanBoard';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Fetch Error');
    return data;
};

export default function WorkspaceCockpitPage() {
    // Fetch Initiatives (which naturally bundle OKRs -> Initiatives -> Quests)
    const { data: initiatives, error: errIni, mutate: mutateIni } = useSWR('/api/hr/initiatives', fetcher);
    const { data: qData, error: errQ, mutate: mutateQ } = useSWR('/api/ess/quests', fetcher);

    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | null>(null);

    // Derive Unique Company Objectives & Key Results (Tier 1) based on the Initiatives assigned to us
    const myKeyResults = useMemo(() => {
        if (!initiatives || !Array.isArray(initiatives)) return [];
        const uniqueKRs = new Map();
        initiatives.forEach((ini: any) => {
            if (ini.keyResult && !uniqueKRs.has(ini.keyResult.id)) {
                uniqueKRs.set(ini.keyResult.id, ini.keyResult);
            }
        });
        return Array.from(uniqueKRs.values());
    }, [initiatives]);

    const handleQuestSubmit = async (questId: string) => {
        setIsLoading(questId);
        try {
            const res = await fetch('/api/ess/quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId, action: 'submit' }),
            });
            if (res.ok) {
                mutateQ();
                // Mutate initiatives as well because Quest completion mathematically bubbles up to Initiative Progress!
                mutateIni();
            } else {
                alert(`Failed to submit quest.`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(null);
        }
    };

    if (errIni || errQ) return <div className="p-6 text-red-500 font-bold">Failed to load Workspace Matrix.</div>;
    if (!initiatives || !qData) return <div className="p-6 text-indigo-500 font-bold animate-pulse text-xl">Initializing Center of Work...</div>;

    const myQuests = qData.myQuests || [];
    // Filter active quests (we only want actionable ones here, not completed)
    const activeQuests = myQuests.filter((ql: any) => ql.status === 'IN_PROGRESS' || ql.status === 'REVIEWING');

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen space-y-12">

            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-3 drop-shadow-sm mb-2">
                    <SparklesIcon className="w-10 h-10 text-indigo-500" />
                    Center of Work
                </h1>
                <p className="text-gray-500 font-medium text-lg">Your unified Cockpit for Company Goals, Action Plans, and Mission Checklists.</p>
            </div>

            {/* TIER 1: The WHY (Company Alignment & OKRs) */}
            <section className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <SparklesIcon className="w-64 h-64" />
                </div>

                <h2 className="text-2xl font-black mb-6 flex items-center gap-2 tracking-wide uppercase text-indigo-200">
                    <span className="bg-indigo-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg">1</span>
                    The Why (Company Alignment)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {myKeyResults.length === 0 ? (
                        <div className="col-span-full p-6 bg-white/10 rounded-2xl border border-white/20 text-indigo-200">
                            You are not currently linked to any Company Objectives. Speak to your manager to cascade OKRs down to you.
                        </div>
                    ) : myKeyResults.map((kr: any) => (
                        <div key={kr.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
                            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">{kr.objective?.title || 'Global Objective'}</h4>
                            <h3 className="font-bold text-xl mb-4 leading-tight">{kr.title}</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-indigo-200">Target: {kr.targetValue} {kr.unit}</span>
                                    <span className="font-black text-white">{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                                </div>
                                <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden border border-white/10">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-1000 relative"
                                        style={{ width: `${Math.min(100, (kr.currentValue / (kr.targetValue || 1)) * 100)}%` }}
                                    >
                                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* TIER 2: The HOW (Action Plans / Initiatives) */}
            <section>
                <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-gray-800 border-b-2 border-orange-100 pb-2">
                    <span className="bg-orange-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-md">2</span>
                    The How (My Action Plans)
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {initiatives.length === 0 ? (
                        <div className="col-span-full py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                            <span className="text-gray-400 font-medium text-lg">No active Initiatives. Formulate your action limits to reach those OKRs!</span>
                        </div>
                    ) : initiatives.map((ini: any) => (
                        <div
                            key={ini.id}
                            onClick={() => setSelectedInitiativeId(selectedInitiativeId === ini.id ? null : ini.id)}
                            className={`bg-white rounded-3xl shadow-md border-2 p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${selectedInitiativeId === ini.id ? 'border-indigo-500 shadow-indigo-100 ring-4 ring-indigo-50' : 'border-orange-50 hover:shadow-xl hover:-translate-y-1'
                                }`}
                        >

                            {/* Status Ribbon */}
                            {ini.status === 'COMPLETED' && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-md">
                                    Completed
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg uppercase ${ini.health === 'ON_TRACK' ? 'bg-green-100 text-green-700' :
                                        ini.health === 'AT_RISK' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {ini.health.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        Due {new Date(ini.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>

                                <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{ini.title}</h3>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2 min-h-10">{ini.description}</p>
                            </div>

                            <div>
                                {/* Boss Fight Rewards */}
                                <div className="flex gap-2 mb-5">
                                    <span className="flex items-center text-xs font-black bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">
                                        <FireIcon className="w-3 h-3 mr-1" /> +{ini.expReward} EXP
                                    </span>
                                    <span className="flex items-center text-xs font-black bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg">
                                        <CurrencyDollarIcon className="w-3 h-3 mr-1" /> +{ini.coinReward} Coins
                                    </span>
                                </div>

                                {/* Mathematical Progress derived from Quests */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-black text-gray-700">
                                        <span>Completion Progress</span>
                                        <span className="text-orange-600">{ini.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000 relative"
                                            style={{ width: `${ini.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 font-medium flex items-center justify-between">
                                    <span>Single-Threaded Owner: {ini.owner?.user?.name || 'Unknown'}</span>
                                    <span>{ini.quests?.length || 0} Connected Quests</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* TIER 3: The WHAT (Execution / Daily Quests) */}
            <section ref={el => {
                if (el && selectedInitiativeId) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }}>
                <div className="flex items-center justify-between mb-6 border-b-2 border-indigo-100 pb-2">
                    <h2 className="text-2xl font-black flex items-center gap-2 text-gray-800 ">
                        <span className="bg-indigo-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-md">3</span>
                        {selectedInitiativeId ? 'Agile Kanban Board' : 'The What (Execution Checklist)'}
                    </h2>
                    {selectedInitiativeId ? (
                        <button
                            onClick={() => setSelectedInitiativeId(null)}
                            className="text-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-300 rounded-lg px-3 py-1 bg-white shadow-sm"
                        >
                            Close Board
                        </button>
                    ) : (
                        <Link href="/ess/quests" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1">
                            Go to Bounties <PlayIcon className="w-4 h-4" />
                        </Link>
                    )}
                </div>

                {selectedInitiativeId ? (
                    <div className="bg-slate-100/50 rounded-3xl border-2 border-slate-200/60 p-2 md:p-6 shadow-inner">
                        <KanbanBoard key={selectedInitiativeId} initiativeId={selectedInitiativeId} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeQuests.length === 0 ? (
                            <div className="col-span-full py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                                <span className="text-gray-400 font-medium text-lg">Your Daily Checklist is empty. Excellent job!</span>
                            </div>
                        ) : activeQuests.map((ql: any) => (
                            <div key={ql.id} className="bg-white rounded-2xl shadow-sm border-2 border-indigo-50 p-6 flex flex-col relative transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                {ql.status === 'REVIEWING' && (
                                    <div className="absolute inset-x-0 top-0 bg-purple-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-widest rounded-t-xl">
                                        Under Review by QM
                                    </div>
                                )}

                                <h3 className={`font-bold text-lg text-gray-900 leading-tight mt-4 mb-2 ${ql.status === 'REVIEWING' ? 'opacity-50' : ''}`}>
                                    {ql.quest.title}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-2 h-10 mb-6">{ql.quest.description}</p>

                                <div className="mt-auto">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100 flex items-center gap-1">
                                            <FireIcon className="w-3 h-3" /> {ql.quest.expReward} EXP
                                        </span>
                                        {ql.quest.coinReward > 0 && (
                                            <span className="text-xs font-black bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg border border-yellow-200 flex items-center gap-1">
                                                <CurrencyDollarIcon className="w-3 h-3" /> {ql.quest.coinReward} Coins
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleQuestSubmit(ql.questId)}
                                        disabled={ql.status === 'REVIEWING' || isLoading === ql.questId}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 shadow-md transition-all"
                                    >
                                        {isLoading === ql.questId ? 'Transmitting...' : ql.status === 'REVIEWING' ? 'Pending Approval' : 'Complete Quest'}
                                        {ql.status !== 'REVIEWING' && <CheckCircleIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
