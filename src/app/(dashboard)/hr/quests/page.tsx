'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { PlusIcon, FireIcon, HandThumbUpIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function QuestMasterPage() {
    const { data: quests, error, mutate } = useSWR('/api/hr/quests', fetcher);
    const { data: employees } = useSWR('/api/hr/employees', fetcher);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        expReward: 50,
        coinReward: 0,
        deadline: '',
        assignedToId: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/hr/quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ title: '', description: '', expReward: 50, coinReward: 0, deadline: '', assignedToId: '' });
                mutate();
            } else {
                alert('Failed to issue Quest. Make sure you are an OWNER or MANAGER.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'OPEN': return <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg">🟢 OPEN (UNCLAIMED)</span>;
            case 'IN_PROGRESS': return <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg">⚔️ IN PROGRESS</span>;
            case 'REVIEWING': return <span className="px-2 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded-lg">👀 REVIEWING</span>;
            case 'COMPLETED': return <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-lg">🏆 COMPLETED</span>;
            default: return <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg">{status}</span>;
        }
    };

    if (error) return <div className="p-6 text-red-500 font-bold border-2 border-red-200 bg-red-50 rounded-xl m-6">Access Error: {error.message}</div>;
    if (!quests) return <div className="p-6 animate-pulse">Loading Quest Master...</div>;
    if (quests.error) return <div className="p-6 text-red-500 font-bold border-2 border-red-200 bg-red-50 rounded-xl m-6">Access Error: {quests.error}</div>;
    if (!Array.isArray(quests)) return <div className="p-6 text-red-500 font-bold">Data alignment error. Administrator privileges required.</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FireIcon className="w-8 h-8 text-orange-500" />
                        Quest Master (HR)
                    </h1>
                    <p className="text-gray-500 mt-1">Deploy gamified missions to employees, incentivizing work with EXP and Coins.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-bold shadow-lg shadow-orange-500/30"
                >
                    <PlusIcon className="w-5 h-5" />
                    Issue New Quest
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quests.map((quest: any) => (
                    <div key={quest.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 transition group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-100 to-transparent opacity-50 rounded-bl-full -z-0"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-3">
                                {getStatusBadge(quest.status)}
                                <div className="flex items-center gap-2 text-sm font-bold bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                    <span className="text-orange-500 flex items-center gap-1"><HandThumbUpIcon className="w-4 h-4" /> {quest.expReward} EXP</span>
                                    {quest.coinReward > 0 && <span className="text-yellow-500 flex items-center gap-1"><CurrencyDollarIcon className="w-4 h-4" /> {quest.coinReward}</span>}
                                </div>
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 leading-tight mb-2">{quest.title}</h3>
                            {quest.description && <p className="text-sm text-gray-500 line-clamp-2 mb-4">{quest.description}</p>}

                            {quest.deadline && (
                                <div className="flex items-center gap-1 text-xs text-red-500 font-medium mb-4 bg-red-50 w-fit px-2 py-1 rounded">
                                    <ClockIcon className="w-4 h-4" />
                                    Due: {new Date(quest.deadline).toLocaleDateString()}
                                </div>
                            )}

                            <div className="border-t border-gray-100 pt-4 mt-auto">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Assigned To</span>
                                    {quest.assignedTo ? (
                                        <div className="flex items-center gap-2">
                                            {quest.assignedTo.user?.image ? (
                                                <Image src={quest.assignedTo.user.image} alt="Avatar" width={24} height={24} className="rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">
                                                    {quest.assignedTo.user?.name?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-gray-700">{quest.assignedTo.user?.name || 'Unknown'}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-medium text-gray-400 border border-dashed border-gray-300 px-2 py-0.5 rounded bg-gray-50">Global Pool (Anyone)</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {quests.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <FireIcon className="w-16 h-16 text-gray-300 mb-3" />
                        <span className="text-gray-500 font-medium">The Quest Board is empty. Start issuing missions to boost productivity!</span>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-orange-100">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2"><FireIcon className="w-6 h-6" /> Issue a Quest</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white/20 p-1 rounded transition">✕</button>
                        </div>

                        <form onSubmit={onSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Quest Title *</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border-2 border-gray-200 rounded-lg p-3 text-lg font-medium focus:border-orange-500 outline-none transition" placeholder="e.g. Close 5 high-ticket leads" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mission Brief (Description)</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none" rows={3} placeholder="Provide clear instructions for the adventurer..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                    <label className="block text-xs font-bold text-orange-800 uppercase mb-1 flex items-center gap-1"><HandThumbUpIcon className="w-4 h-4" /> EXP Bounty</label>
                                    <input type="number" required min="10" step="10" value={formData.expReward} onChange={e => setFormData({ ...formData, expReward: Number(e.target.value) })} className="w-full border border-orange-200 rounded-md p-2 font-bold text-orange-600 bg-white" />
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                    <label className="block text-xs font-bold text-yellow-800 uppercase mb-1 flex items-center gap-1"><CurrencyDollarIcon className="w-4 h-4" /> Coin Bounty (Optional)</label>
                                    <input type="number" min="0" value={formData.coinReward} onChange={e => setFormData({ ...formData, coinReward: Number(e.target.value) })} className="w-full border border-yellow-200 rounded-md p-2 font-bold text-yellow-600 bg-white" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Deadline</label>
                                    <input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Assign To (Optional)</label>
                                    <select value={formData.assignedToId} onChange={e => setFormData({ ...formData, assignedToId: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none bg-white">
                                        <option value="">-- Open for anyone --</option>
                                        {employees?.map((emp: any) => (
                                            <option key={emp.id} value={emp.id}>{emp.user?.name || emp.user?.email}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition font-bold">Cancel</button>
                                <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white px-6 py-2.5 rounded-xl transition font-bold shadow-lg shadow-orange-500/30">
                                    {isLoading ? 'Deploying...' : 'Deploy Quest'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
