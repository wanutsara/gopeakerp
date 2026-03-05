import React from 'react';
import Image from 'next/image';
import { XMarkIcon, FireIcon, HandThumbUpIcon, CurrencyDollarIcon, StarIcon, TrophyIcon } from '@heroicons/react/24/outline';

export default function EmployeeDrawer({ node, onClose }: { node: any | null, onClose: () => void }) {
    if (!node) return null;

    const emp = node.data;
    const expThreshold = (emp.level || 1) * 100;
    const progressPerc = Math.min(100, Math.max(0, ((emp.exp || 0) / expThreshold) * 100));

    // Gamified visual styles based on Level
    let powerRing = "ring-blue-100";
    if (emp.level >= 10) powerRing = "ring-orange-200";
    if (emp.level >= 20) powerRing = "ring-purple-300";

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col">
            <div className="bg-slate-50 p-6 relative border-b border-slate-100 flex-shrink-0">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition shadow-sm border border-slate-100">
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center mt-4">
                    <div className={`relative ring-4 ${powerRing} rounded-full p-1 bg-white shadow-md`}>
                        {emp.image ? (
                            <Image src={emp.image} alt={emp.name} width={96} height={96} className="rounded-full object-cover shadow-sm bg-white border border-slate-200" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-sm">
                                {emp.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-extrabold text-sm px-3 py-1 rounded-lg border-2 border-white shadow-lg">
                            Lv.{emp.level || 1}
                        </div>
                    </div>

                    <h2 className="text-xl font-extrabold text-slate-800 mt-5">{emp.name}</h2>
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-wide mt-1">{emp.jobPosition || 'Employee'}</p>
                    {emp.department && (
                        <p className="text-xs font-semibold text-slate-500 mt-1 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                            {emp.department}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                <div>
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <StarIcon className="w-4 h-4 text-slate-400" /> Talent Progression
                    </h3>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-slate-700">RPG Experience</span>
                            <span className="text-xs font-extrabold text-blue-600">{emp.exp} / {expThreshold} XP</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner mb-4">
                            <div
                                className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2.5 rounded-full"
                                style={{ width: `${progressPerc}%` }}
                            />
                        </div>

                        <div className="flex justify-around items-center pt-4 border-t border-slate-200">
                            <div className="flex flex-col items-center">
                                <HandThumbUpIcon className="w-6 h-6 text-slate-300 mb-1" />
                                <span className="text-xs font-bold text-slate-500">Kudos</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <TrophyIcon className="w-6 h-6 text-yellow-400 mb-1" />
                                <span className="text-xs font-bold text-slate-600">Badges</span>
                            </div>
                            <div className="flex flex-col items-center group cursor-pointer hover:scale-110 transition">
                                <FireIcon className="w-6 h-6 text-orange-500 mb-1" />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-orange-500 transition">View Quests</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">System Access</h3>
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl divide-y divide-slate-100">
                        <div className="p-3 flex justify-between items-center hover:bg-slate-50 transition cursor-pointer">
                            <span className="text-sm font-semibold text-slate-700">Goal Alignment (OKRs)</span>
                            <span className="text-xs text-slate-400 font-bold">▶</span>
                        </div>
                        <div className="p-3 flex justify-between items-center hover:bg-slate-50 transition cursor-pointer">
                            <span className="text-sm font-semibold text-slate-700">Performance Review</span>
                            <span className="text-xs text-slate-400 font-bold">▶</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button
                    onClick={() => alert('Future Feature: Opening full Talent Dossier!')}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                    <StarIcon className="w-5 h-5 text-yellow-400" /> Executive Talent View
                </button>
            </div>
        </div>
    );
}
