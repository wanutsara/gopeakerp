'use client';
import useSWR from 'swr';
import Image from 'next/image';
import { ShieldCheckIcon, TrophyIcon, FireIcon, CurrencyDollarIcon, StarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function RPGProfilePage() {
    const { data: profile, error } = useSWR('/api/ess/profile', fetcher);

    if (error) return <div className="p-6 text-red-500">Failed to load Character Profile.</div>;
    if (!profile) return <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Summoning Character Data...</div>;

    // Level Logic
    const currentLevel = profile.level;
    const currentExp = profile.exp;
    const expToNextLevel = currentLevel * 100;
    const expPercentage = Math.min(100, Math.round((currentExp / expToNextLevel) * 100));

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3 drop-shadow-sm">
                    <ShieldCheckIcon className="w-10 h-10 text-indigo-500" />
                    Character Status
                </h1>
                <p className="text-gray-500 font-medium mt-1">Track your career progression, skill tree, and achievements.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Avatar & Basic Stats */}
                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 p-8 border border-indigo-50 text-center relative overflow-hidden group">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10"></div>

                    <div className="relative inline-block mb-6">
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden mx-auto bg-gray-100 flex items-center justify-center relative z-10">
                            {profile.user?.image ? (
                                <Image src={profile.user.image} alt="Avatar" width={128} height={128} className="object-cover" />
                            ) : (
                                <span className="text-4xl font-black text-indigo-300">{profile.user?.name?.charAt(0) || '?'}</span>
                            )}
                        </div>
                        <div className="absolute -bottom-3 inset-x-0 flex justify-center z-20">
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-sm px-4 py-1.5 rounded-full border-2 border-white shadow-lg">
                                Lv. {currentLevel}
                            </span>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.user?.name}</h2>
                    <p className="text-indigo-600 font-bold text-sm tracking-wider uppercase mb-8">
                        {profile.jobPosition?.title || 'Freelance Adventurer'}
                    </p>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest"><FireIcon className="w-4 h-4 inline mr-1 text-orange-500" /> EXP</span>
                            <span className="text-sm font-black text-gray-800">{currentExp} / {expToNextLevel}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${expPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100 flex flex-col items-center justify-center">
                            <CurrencyDollarIcon className="w-8 h-8 text-yellow-500 mb-1" />
                            <span className="text-2xl font-black text-yellow-600">{profile.coins}</span>
                            <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest mt-1">Coins</span>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex flex-col items-center justify-center">
                            <TrophyIcon className="w-8 h-8 text-blue-500 mb-1" />
                            <span className="text-2xl font-black text-blue-600">{profile._count?.questLogs || 0}</span>
                            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mt-1">Quests Done</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Skill Tree & Job Requirements */}
                <div className="lg:col-span-2 space-y-8">

                    <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <StarIcon className="w-6 h-6 text-yellow-500" />
                            My Skill Tree
                        </h3>

                        {profile.skills && profile.skills.length > 0 ? (
                            <div className="space-y-4">
                                {profile.skills.map((skill: any) => (
                                    <div key={skill.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-indigo-300 transition-colors">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{skill.competency?.name}</h4>
                                            <p className="text-sm text-gray-500">{skill.competency?.description || 'No description available.'}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <div key={level} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${level <= skill.currentLevel ? 'bg-indigo-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                                                    L{level}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                <p className="text-gray-500 font-medium mb-2">You haven't acquired any validated skills yet.</p>
                                <button className="text-indigo-600 font-bold hover:underline text-sm">Request Skill Assessment</button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <ChartBarIcon className="w-6 h-6 text-indigo-500" />
                            Job Position Requirements
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">Train these competencies to secure promotions and salary band increases for the <strong className="text-indigo-600">{profile.jobPosition?.title}</strong> path.</p>

                        {profile.jobPosition?.competencies && profile.jobPosition.competencies.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {profile.jobPosition.competencies.map((req: any) => {
                                    // Find if employee has this skill
                                    const hasSkill = profile.skills?.find((s: any) => s.competencyId === req.competencyId);
                                    const isMet = hasSkill && hasSkill.currentLevel >= req.requiredLevel;

                                    return (
                                        <div key={req.id} className={`p-4 rounded-xl border-2 ${isMet ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-bold text-gray-900 text-sm">{req.competency.name}</h5>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded ${isMet ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'}`}>
                                                    REQ: Lv.{req.requiredLevel}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-600">Your Level:</span>
                                                <span className={`text-sm font-black ${isMet ? 'text-green-600' : 'text-red-500'}`}>
                                                    {hasSkill ? `Lv. ${hasSkill.currentLevel}` : 'N/A'}
                                                </span>
                                                {isMet && <CheckCircleIcon className="w-4 h-4 text-green-500 ml-auto" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-gray-400 font-medium bg-gray-50 rounded-xl">
                                This position has no strict competency mappings.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
