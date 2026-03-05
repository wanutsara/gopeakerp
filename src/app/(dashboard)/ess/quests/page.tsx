'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { SparklesIcon, CheckCircleIcon, PlayIcon, CurrencyDollarIcon, FireIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function EssQuestBoardPage() {
    const { data, error, mutate } = useSWR('/api/ess/quests', fetcher);
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleAction = async (questId: string, action: 'claim' | 'submit') => {
        setIsLoading(questId);
        try {
            const res = await fetch('/api/ess/quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId, action }),
            });
            if (res.ok) {
                mutate();
            } else {
                alert(`Failed to ${action} quest.`);
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred.');
        } finally {
            setIsLoading(null);
        }
    };

    if (error) return <div className="p-6 text-red-500">Failed to load Quest Board.</div>;
    if (!data) return <div className="p-6 animate-pulse">Loading the Adventurer's Guild...</div>;
    if (data.error) return <div className="p-6 text-red-500 font-bold border-2 border-red-200 bg-red-50 rounded-xl m-6">System Error: {data.error}</div>;

    const { myQuests, openQuests } = data;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 flex items-center gap-3 drop-shadow-sm">
                        <SparklesIcon className="w-10 h-10 text-orange-500" />
                        Adventurer's Quest Board
                    </h1>
                    <p className="text-gray-600 mt-2 font-medium">Claim missions, earn EXP, and level up your career.</p>
                </div>
            </div>

            <div className="space-y-12">
                {/* Section: My Active Quests */}
                <section>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800 border-b-2 border-indigo-100 pb-2">
                        <PlayIcon className="w-6 h-6 text-indigo-500" /> My Active Quests
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myQuests?.filter((q: any) => q.status === 'IN_PROGRESS' || q.status === 'REVIEWING').map((ql: any) => (
                            <div key={ql.id} className="relative bg-white rounded-2xl shadow-sm border-2 border-indigo-50 p-6 overflow-hidden transform transition hover:-translate-y-1 hover:shadow-xl">
                                {ql.status === 'REVIEWING' && (
                                    <div className="absolute inset-x-0 top-0 bg-purple-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                                        Under Review by Quest Master
                                    </div>
                                )}

                                <div className={`pt-4 flex justify-between items-start mb-4 ${ql.status === 'REVIEWING' ? 'opacity-60' : ''}`}>
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{ql.quest.title}</h3>
                                </div>

                                <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10">{ql.quest.description}</p>

                                <div className="flex items-center gap-3 mb-6">
                                    <span className="flex items-center justify-center gap-1.5 bg-orange-100 text-orange-700 font-black text-sm px-3 py-1.5 rounded-xl border border-orange-200">
                                        <FireIcon className="w-4 h-4" /> {ql.quest.expReward} EXP
                                    </span>
                                    {ql.quest.coinReward > 0 && (
                                        <span className="flex items-center justify-center gap-1.5 bg-yellow-100 text-yellow-700 font-black text-sm px-3 py-1.5 rounded-xl border border-yellow-200">
                                            <CurrencyDollarIcon className="w-4 h-4" /> {ql.quest.coinReward}
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleAction(ql.questId, 'submit')}
                                    disabled={ql.status === 'REVIEWING' || isLoading === ql.questId}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 transition shadow-lg shadow-indigo-500/30"
                                >
                                    {isLoading === ql.questId ? 'Processing...' : ql.status === 'REVIEWING' ? 'Pending Approval' : 'Submit Quest'}
                                    {ql.status !== 'REVIEWING' && <CheckCircleIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        ))}
                        {(!myQuests || myQuests.filter((q: any) => q.status === 'IN_PROGRESS' || q.status === 'REVIEWING').length === 0) && (
                            <div className="col-span-full py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                                <p className="text-gray-500 font-medium">You have no active quests. Go claim a bounty!</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Section: Open Bounties / Quest Board */}
                <section>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800 border-b-2 border-orange-100 pb-2">
                        <FireIcon className="w-6 h-6 text-orange-500" /> Open Bounties (Global Quests)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {openQuests?.map((quest: any) => (
                            <div key={quest.id} className="group bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-orange-300 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        {quest.creator?.image ? (
                                            <Image src={quest.creator.image} alt="Quest Giver" width={28} height={28} className="rounded-full ring-2 ring-orange-200" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                                                {quest.creator?.name?.charAt(0) || 'QM'}
                                            </div>
                                        )}
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{quest.creator?.name || 'Quest Master'}</span>
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg text-gray-900 leading-tight mb-2 group-hover:text-orange-600 transition-colors">{quest.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10">{quest.description}</p>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2">
                                        <span className="text-orange-600 font-black text-sm flex items-center gap-1">
                                            <FireIcon className="w-5 h-5" /> {quest.expReward} EXP
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleAction(quest.id, 'claim')}
                                        disabled={isLoading === quest.id}
                                        className="bg-orange-100 hover:bg-orange-500 text-orange-700 hover:text-white font-bold py-2 px-5 rounded-lg transition-all disabled:opacity-50"
                                    >
                                        {isLoading === quest.id ? 'Claiming...' : 'Claim Bounty'}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!openQuests || openQuests.length === 0) && (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <span className="text-gray-400 font-medium">No open bounties available right now. Tell your Quest Master to issue more!</span>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
