"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { Target, Shield, CheckCircle2, Clock, Zap, Coins, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function QuestsMobilePage() {
    const { data, error, mutate, isLoading } = useSWR('/api/ess/quests', fetcher);
    const [activeTab, setActiveTab] = useState<'BOUNTIES' | 'MY_QUESTS'>('BOUNTIES');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Dopamine Confetti Hook
    const triggerConfetti = () => {
        const count = 200;
        const defaults = { origin: { y: 0.7 }, zIndex: 100 };
        function fire(particleRatio: number, opts: any) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }
        fire(0.25, { spread: 26, startVelocity: 55, colors: ['#10B981', '#3B82F6'] });
        fire(0.2, { spread: 60, colors: ['#F59E0B', '#EF4444'] });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    };

    const handleAction = async (questId: string, action: 'claim' | 'submit') => {
        setActionLoading(questId);
        try {
            const res = await fetch('/api/ess/quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId, action })
            });

            if (res.ok) {
                if (action === 'submit') {
                    triggerConfetti();
                } else {
                    // Slight vibration pattern for native feel on claim
                    if (typeof window !== 'undefined' && window.navigator.vibrate) {
                        window.navigator.vibrate(50);
                    }
                }
                await mutate(); // Refresh Data seamlessly
            } else {
                alert("เกิดข้อผิดพลาด ไม่สามารถดำเนินการได้");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    if (error) return <div className="p-6 text-center text-red-500 font-bold">Failed to load quests.</div>;

    const myQuests = data?.myQuests || [];
    const openQuests = data?.openQuests || [];

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 selection:bg-blue-500/30">
            {/* Native-style Ambient Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 pt-12 pb-6 px-6 relative overflow-hidden rounded-b-3xl shadow-lg">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 blur-[80px] rounded-full mix-blend-screen pointer-events-none"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            <Target className="w-6 h-6 text-emerald-400" />
                            Quest Board
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">กระดานล่าค่าหัว รับภารกิจอัปเลเวล 🚀</p>
                    </div>
                </div>
            </div>

            {/* Glassmorphism Tab View */}
            <div className="sticky top-0 z-40 bg-[#F8FAFC]/80 backdrop-blur-xl border-b border-slate-200 px-4 py-3">
                <div className="flex bg-slate-200/60 p-1 rounded-2xl relative">
                    <button
                        onClick={() => setActiveTab('BOUNTIES')}
                        className={`flex-1 relative z-10 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-300 ${activeTab === 'BOUNTIES' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Flame className="w-4 h-4" /> Bounties
                        {openQuests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full absolute top-1 right-3">{openQuests.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('MY_QUESTS')}
                        className={`flex-1 relative z-10 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-300 ${activeTab === 'MY_QUESTS' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Shield className="w-4 h-4" /> My Quests
                        {myQuests.some((q: any) => q.status === 'IN_PROGRESS') && <span className="w-2 h-2 bg-emerald-500 rounded-full absolute top-2 right-4 animate-pulse"></span>}
                    </button>

                    {/* Sliding Indicator */}
                    <motion.div
                        initial={false}
                        animate={{ x: activeTab === 'BOUNTIES' ? 0 : '100%' }}
                        className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm border border-slate-200 z-0"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="p-4 space-y-4">
                {isLoading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white/50 animate-pulse h-32 rounded-3xl border border-slate-200"></div>
                        ))}
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'BOUNTIES' ? (
                            <motion.div
                                key="bounties"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {openQuests.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Target className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-semibold">ไม่มีภารกิจใหม่ในขณะนี้</p>
                                    </div>
                                ) : (
                                    openQuests.map((quest: any) => (
                                        <motion.div
                                            key={quest.id}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-200 flex flex-col gap-3 relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-[50px] -z-10"></div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-slate-800 text-[15px] leading-tight flex-1">{quest.title}</h3>
                                                <div className="bg-emerald-50 text-emerald-600 font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-100 shrink-0 ml-2">
                                                    <Zap className="w-3 h-3 text-yellow-500" />
                                                    {quest.expReward} EXP
                                                </div>
                                            </div>

                                            {quest.description && (
                                                <p className="text-sm text-slate-500 line-clamp-2">{quest.description}</p>
                                            )}

                                            <div className="flex justify-between items-end mt-2 pt-3 border-t border-slate-100">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {quest.deadline ? new Date(quest.deadline).toLocaleDateString('th-TH') : 'ไม่มีกำหนด'}
                                                </div>
                                                <button
                                                    onClick={() => handleAction(quest.id, 'claim')}
                                                    disabled={actionLoading === quest.id}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {actionLoading === quest.id ? 'กำลังรับ...' : 'รับภารกิจ'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="my-quests"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {myQuests.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Shield className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-semibold">คุณยังไม่ได้รับภารกิจใดๆ</p>
                                    </div>
                                ) : (
                                    myQuests.map((log: any) => {
                                        const { quest, status } = log;
                                        const isCompleted = status === 'COMPLETED';

                                        return (
                                            <div
                                                key={log.id}
                                                className={`rounded-[24px] p-5 shadow-sm border flex flex-col gap-3 relative overflow-hidden transition-colors ${isCompleted ? 'bg-slate-50/50 border-slate-200/50' : 'bg-white border-emerald-200/60 shadow-emerald-500/5'}`}
                                            >
                                                {!isCompleted && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-[50px] -z-10"></div>}
                                                <div className="flex justify-between items-start">
                                                    <h3 className={`font-bold text-[15px] leading-tight flex-1 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                        {quest.title}
                                                    </h3>
                                                    {isCompleted ? (
                                                        <div className="bg-slate-100 text-slate-400 font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ml-2">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            สำเร็จ
                                                        </div>
                                                    ) : (
                                                        <div className="bg-yellow-50 text-yellow-600 font-black text-[10px] px-2 py-0.5 rounded-md border border-yellow-200/50 shrink-0 ml-2 uppercase tracking-wide animate-pulse">
                                                            In Progress
                                                        </div>
                                                    )}
                                                </div>

                                                {!isCompleted && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="bg-emerald-50 text-emerald-600 font-bold text-[11px] px-2 py-0.5 rounded px-1.5 flex items-center gap-1 border border-emerald-200">
                                                            <Zap className="w-3 h-3 text-yellow-500" /> +{quest.expReward} EXP
                                                        </div>
                                                        {quest.coinReward > 0 && (
                                                            <div className="bg-amber-50 text-amber-600 font-bold text-[11px] px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                                                                <Coins className="w-3 h-3 text-amber-500" /> +{quest.coinReward}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-end mt-2 pt-3 border-t border-slate-100">
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                        {quest.creator?.image ? (
                                                            <img src={quest.creator.image} className="w-5 h-5 rounded-full" alt="M" />
                                                        ) : (
                                                            <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-bold">M</div>
                                                        )}
                                                        <span>มอบอหมายโดย {quest.creator?.name || 'Manager'}</span>
                                                    </div>
                                                    {!isCompleted && (
                                                        <button
                                                            onClick={() => handleAction(quest.id, 'submit')}
                                                            disabled={actionLoading === quest.id}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                                        >
                                                            {actionLoading === quest.id ? 'ระบบกำลังประมวล...' : (
                                                                <><CheckCircle2 className="w-3.5 h-3.5" /> ส่งมอบงาน</>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
