// @ts-nocheck
"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
    ClockIcon,
    ExclamationTriangleIcon,
    UserGroupIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    InboxIcon,
    FireIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function AttendanceDashboardPage() {
    const { data: session } = useSession();
    const { data, error, isLoading, mutate } = useSWR('/api/hr/attendance/analytics', fetcher);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-t-4 border-indigo-600 animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-t-4 border-emerald-500 animate-spin opacity-50 block" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    </div>
                    <p className="text-indigo-600 font-bold animate-pulse">Establishing Command Link...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="bg-rose-50/50 backdrop-blur-md border border-rose-200 text-rose-700 p-8 rounded-3xl shadow-2xl text-center space-y-4">
                    <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-rose-500" />
                    <h2 className="text-2xl font-black">Pulse Sensor Offline</h2>
                    <p className="font-medium text-rose-600/80">Unable to decrypt the live attendance stream. Please check network integrity.</p>
                </div>
            </div>
        );
    }

    const { today, yesterday, averageArrivalTime, weeklyTrends, leaderboard, dailyRoster } = data;
    const todayDate = format(new Date(), 'dd MMMM yyyy', { locale: th });

    // KPI Helper
    const getTrend = (current: number, past: number, invertGood = false) => {
        if (past === 0) return { icon: null, text: "-", color: "text-slate-400" };
        const diff = current - past;
        if (diff === 0) return { icon: null, text: "Stable", color: "text-slate-400" };

        const isUp = diff > 0;
        const Icon = isUp ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

        let isGood = isUp;
        if (invertGood) isGood = !isUp;

        return {
            icon: <Icon className="w-4 h-4" strokeWidth={3} />,
            text: `${Math.abs(diff)}${invertGood ? '' : '%'} vs Yday`,
            color: isGood ? "text-emerald-500" : "text-rose-500",
            bg: isGood ? "bg-emerald-500/10" : "bg-rose-500/10"
        };
    };

    const rateTrend = getTrend(parseFloat(today.rate), parseFloat(yesterday.rate));
    const lateTrend = getTrend(today.late, yesterday.late, true);
    const absentTrend = getTrend(today.absent, yesterday.absent, true);

    const handleStatusOverride = async (logId: string, newStatus: string) => {
        try {
            const res = await fetch('/api/hr/attendance/override', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: logId, newStatus })
            });
            if (res.ok) mutate();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 bg-slate-50/30 min-h-screen">
            {/* ------------------ GLASS HEADER ------------------ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-indigo-900 tracking-tight">
                            Live Attendance Pulse
                        </h1>
                    </div>
                    <p className="text-slate-500 mt-1 font-medium pl-6">Real-time organizational vector mapping • {todayDate}</p>
                </div>

                <div className="mt-6 md:mt-0 flex flex-col md:flex-row items-end md:items-center space-y-3 md:space-y-0 md:space-x-4 x-z-10">
                    <div className="flex items-center space-x-3 bg-white/80 border border-slate-100 px-5 py-2.5 rounded-2xl text-slate-700 font-bold shadow-sm">
                        <ClockIcon className="w-5 h-5 text-indigo-500" strokeWidth={2.5} />
                        <span>Core Arrival: <span className="text-indigo-600 font-black">{averageArrivalTime} น.</span></span>
                    </div>
                    <Link
                        href="/hr/attendance/requests"
                        className="group flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 font-bold"
                    >
                        <InboxIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>Leave Requests</span>
                        <span className="ml-2 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">2</span>
                    </Link>
                </div>
            </div>

            {/* ------------------ CORE KPI METRICS ------------------ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Global Rate */}
                <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 border border-slate-100 flex flex-col justify-between group relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-50/50 rounded-tl-full -z-10 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Active Rate</p>
                            <h3 className="text-5xl font-black text-slate-800 mt-2 tracking-tighter">{today.rate}<span className="text-2xl text-slate-300">%</span></h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <UserGroupIcon className="w-7 h-7" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${rateTrend.bg} ${rateTrend.color}`}>
                            {rateTrend.icon} <span>{rateTrend.text}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-300">Workforce Alpha</span>
                    </div>
                </div>

                {/* On Time */}
                <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 border border-slate-100 flex flex-col justify-between group relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-50/50 rounded-tl-full -z-10 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Punctual</p>
                            <h3 className="text-4xl font-black text-emerald-600 mt-2">{today.onTime} <span className="text-xl text-emerald-200 font-normal">Staff</span></h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                            <CheckCircleIcon className="w-7 h-7" />
                        </div>
                    </div>
                    <div className="mt-6 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{ width: `${Math.round((today.onTime / today.totalEmployees) * 100) || 0}%` }}></div>
                    </div>
                </div>

                {/* Late */}
                <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 border border-slate-100 flex flex-col justify-between group relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-amber-50/50 rounded-tl-full -z-10 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Late</p>
                            <h3 className="text-4xl font-black text-amber-500 mt-2">{today.late} <span className="text-xl text-amber-200 font-normal">Staff</span></h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
                            <ClockIcon className="w-7 h-7" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${lateTrend.bg} ${lateTrend.color}`}>
                            {lateTrend.icon} <span>{lateTrend.text}</span>
                        </div>
                    </div>
                </div>

                {/* Absent */}
                <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 border border-slate-100 flex flex-col justify-between group relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-rose-50/50 rounded-tl-full -z-10 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">AWOL / Null</p>
                            <h3 className="text-4xl font-black text-rose-500 mt-2">{today.absent} <span className="text-xl text-rose-200 font-normal">Staff</span></h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-2xl shadow-lg shadow-rose-200">
                            <XCircleIcon className="w-7 h-7" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${absentTrend.bg} ${absentTrend.color}`}>
                            {absentTrend.icon} <span>{absentTrend.text}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------ VISUAL MATRIX ------------------ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 7-Day Trend Chart */}
                <div className="lg:col-span-2 bg-gradient-to-b from-white to-slate-50/50 rounded-3xl shadow-sm p-8 border border-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 -z-10">
                        <FireIcon className="w-64 h-64 opacity-50 blur-3xl" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 tracking-tight">
                        <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                        Velocity Curve (T-7 Days)
                    </h2>
                    <div className="h-80 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }} className="mt-4" />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                    cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 800 }} iconType="circle" />
                                <Bar dataKey="onTime" name="Punctual" stackId="a" fill="url(#colorEmerald)" radius={[0, 0, 8, 8]} barSize={28} />
                                <Bar dataKey="late" name="Late" stackId="a" fill="url(#colorAmber)" />
                                <Bar dataKey="absent" name="Null" stackId="a" fill="url(#colorRose)" radius={[8, 8, 0, 0]} />

                                <defs>
                                    <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={1} />
                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.8} />
                                    </linearGradient>
                                    <linearGradient id="colorAmber" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={1} />
                                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.8} />
                                    </linearGradient>
                                    <linearGradient id="colorRose" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={1} />
                                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Algorithmic Leaderboards */}
                <div className="space-y-6">
                    {/* Heroes */}
                    <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <span className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl text-xl">🏆</span>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Precision Elites</h2>
                        </div>
                        <div className="space-y-4">
                            {leaderboard.topPunctual.length === 0 ? (
                                <p className="text-sm text-slate-400 font-bold text-center py-4">Calibration Pending.</p>
                            ) : (
                                leaderboard.topPunctual.map((emp: any, idx: number) => (
                                    <div key={emp.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-100 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{emp.name}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{emp.department}</p>
                                            </div>
                                        </div>
                                        <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                            {emp.count}x
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Deficit Watchlist */}
                    <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100 hover:shadow-xl hover:border-amber-200 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <span className="p-2 bg-gradient-to-br from-rose-100 to-orange-100 rounded-xl text-xl">⚠️</span>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Deficit Watchlist</h2>
                        </div>
                        <div className="space-y-4">
                            {leaderboard.lateWatchlist.length === 0 ? (
                                <p className="text-sm text-slate-400 font-bold text-center py-4">Total Synchronization Status: Green 🌿</p>
                            ) : (
                                leaderboard.lateWatchlist.map((emp: any, idx: number) => (
                                    <div key={emp.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-110 transition-transform ${idx === 0 ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-200' : 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{emp.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 text-right">
                                            {emp.count} Flags
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------ DAILY STREAM (TABLE) ------------------ */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-end bg-gradient-to-b from-white to-slate-50/30">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Core Roster Stream</h2>
                        <p className="text-sm text-slate-400 font-bold mt-1 tracking-wide">Decrypted ledger mapping • {dailyRoster.length} Entities</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Live Syncing</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm sticky top-0">
                            <tr>
                                <th className="px-8 py-5 font-black text-xs text-slate-400 uppercase tracking-widest w-[30%]">Entity</th>
                                <th className="px-8 py-5 font-black text-xs text-slate-400 uppercase tracking-widest">Division</th>
                                <th className="px-8 py-5 font-black text-xs text-slate-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-8 py-5 font-black text-xs text-slate-400 uppercase tracking-widest">State</th>
                                <th className="px-8 py-5 font-black text-xs text-slate-400 uppercase tracking-widest text-right">Authorization Override</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {dailyRoster.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-bold">
                                        No network check-ins detected yet.
                                    </td>
                                </tr>
                            ) : (
                                dailyRoster.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                {log.image ? (
                                                    <img src={log.image} alt={log.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 text-slate-100 flex items-center justify-center font-black shadow-[0_0_10px_rgba(0,0,0,0.1)]">
                                                        {log.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{log.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 font-semibold text-slate-500 text-xs uppercase tracking-wider">{log.department}</td>
                                        <td className="px-8 py-5 font-black text-slate-800">
                                            {log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm:ss น.') : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-8 py-5">
                                            {log.status === 'ON_TIME' && (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                                                    Valid
                                                </span>
                                            )}
                                            {log.status === 'LATE' && (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]"></span>
                                                    Delayed
                                                </span>
                                            )}
                                            {log.status === 'OUT_OF_LOCATION' && (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                    Remote Node
                                                </span>
                                            )}
                                            {log.status === 'ABSENT' && (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    Null
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right flex justify-end">
                                            <div className="relative group/select">
                                                <select
                                                    className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-sm hover:shadow transition-shadow"
                                                    value={log.status}
                                                    onChange={(e) => handleStatusOverride(log.id, e.target.value)}
                                                >
                                                    <option value="ON_TIME" className="font-bold">✅ Override: Valid</option>
                                                    <option value="LATE" className="font-bold">🚨 Override: Delayed</option>
                                                    <option value="OUT_OF_LOCATION" className="font-bold">🌍 Override: Remote</option>
                                                    <option value="ABSENT" className="font-bold">❌ Override: Null</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                                    <svg className="fill-current h-4 w-4 text-slate-400 group-hover/select:text-indigo-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
