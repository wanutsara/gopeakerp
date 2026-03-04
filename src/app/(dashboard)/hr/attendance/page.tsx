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
    ArrowTrendingDownIcon
} from "@heroicons/react/24/outline";
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

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AttendanceDashboardPage() {
    const { data: session } = useSession();
    const { data, error, isLoading, mutate } = useSWR('/api/hr/attendance/analytics', fetcher);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6 bg-red-50 text-red-600 rounded-xl m-6">
                <p>Failed to load attendance analytics data.</p>
            </div>
        );
    }

    const { today, yesterday, averageArrivalTime, weeklyTrends, leaderboard, dailyRoster } = data;
    const todayDate = format(new Date(), 'dd MMMM yyyy', { locale: th });

    // Helper for KPI Trends
    const getTrend = (current: number, past: number, invertGood = false) => {
        if (past === 0) return { icon: null, text: "-", color: "text-gray-400" };
        const diff = current - past;
        if (diff === 0) return { icon: null, text: "Unchanged", color: "text-gray-500" };

        const isUp = diff > 0;
        const Icon = isUp ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

        let isGood = isUp;
        if (invertGood) isGood = !isUp; // For lates/absences, going down is good

        return {
            icon: <Icon className="w-4 h-4" />,
            text: `${Math.abs(diff)} vs Yesterday`,
            color: isGood ? "text-green-600" : "text-red-600",
            bg: isGood ? "bg-green-100" : "bg-red-100"
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
            if (!res.ok) {
                alert("Failed to update status.");
            } else {
                mutate(); // Refresh the dashboard locally
            }
        } catch (error) {
            console.error(error);
            alert("Network error.");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ศูนย์บัญชาการข้อมูลการลงเวลา (The Pulse)</h1>
                    <p className="text-gray-500 mt-1">ภาพรวมการเช็คอินแบบ Real-time ประจำวันที่ {todayDate}</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 font-medium">
                    <ClockIcon className="w-5 h-5" />
                    <span>Avg Arrival: {averageArrivalTime} น.</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Rate */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{today.rate}%</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <UserGroupIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className={`mt-4 flex items-center gap-1.5 text-sm font-medium ${rateTrend.color}`}>
                        {rateTrend.icon} <span>{rateTrend.text}</span>
                    </div>
                </div>

                {/* On Time */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">On Time (มาตรงเวลา)</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{today.onTime} <span className="text-lg text-gray-400 font-normal">คน</span></h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <CheckCircleIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                        <span>{Math.round((today.onTime / today.totalEmployees) * 100) || 0}% of workforce</span>
                    </div>
                </div>

                {/* Late */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Late (มาสาย)</p>
                            <h3 className="text-3xl font-bold text-red-600 mt-2">{today.late} <span className="text-lg text-red-400 font-normal">คน</span></h3>
                        </div>
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className={`mt-4 flex items-center gap-1.5 text-sm font-medium ${lateTrend.color}`}>
                        {lateTrend.icon} <span>{lateTrend.text}</span>
                    </div>
                </div>

                {/* Absent */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Absent (ขาด/ลา)</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{today.absent} <span className="text-lg text-gray-400 font-normal">คน</span></h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <XCircleIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className={`mt-4 flex items-center gap-1.5 text-sm font-medium ${absentTrend.color}`}>
                        {absentTrend.icon} <span>{absentTrend.text}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Weekly Punctuality Patterns</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 14 }} className="mt-2" />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="onTime" name="On Time" stackId="a" fill="#34D399" radius={[0, 0, 4, 4]} barSize={40} />
                                <Bar dataKey="late" name="Late" stackId="a" fill="#FBBF24" />
                                <Bar dataKey="absent" name="Absent" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leaderboards */}
                <div className="space-y-6">
                    {/* Fame */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">🏆</span>
                            <h2 className="text-lg font-bold text-gray-900">Top Punctual (Month)</h2>
                        </div>
                        <div className="space-y-4">
                            {leaderboard.topPunctual.length === 0 ? (
                                <p className="text-sm text-gray-500">No data available.</p>
                            ) : (
                                leaderboard.topPunctual.map((emp: any, idx: number) => (
                                    <div key={emp.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                                                <p className="text-xs text-gray-500">{emp.department}</p>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-emerald-600">
                                            {emp.count} times
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Watchlist */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">⚠️</span>
                            <h2 className="text-lg font-bold text-gray-900">Late Watchlist (Month)</h2>
                        </div>
                        <div className="space-y-4">
                            {leaderboard.lateWatchlist.length === 0 ? (
                                <p className="text-sm text-gray-500">Everyone is perfectly on time!</p>
                            ) : (
                                leaderboard.lateWatchlist.map((emp: any, idx: number) => (
                                    <div key={emp.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-50 text-orange-500'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                                                <p className="text-xs text-gray-500">{emp.department}</p>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                                            {emp.count} lates
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Roster Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Today's Roster (Real-time)</h2>
                    <p className="text-sm text-gray-500 mt-1">Detailed list of employee check-ins for today.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 font-medium">Employee</th>
                                <th className="px-6 py-4 font-medium">Department</th>
                                <th className="px-6 py-4 font-medium">Check-In Time</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dailyRoster.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No check-ins recorded for today yet.
                                    </td>
                                </tr>
                            ) : (
                                dailyRoster.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {log.image ? (
                                                    <img src={log.image} alt={log.name} className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                        {log.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-gray-900">{log.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{log.department}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm:ss น.') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.status === 'ON_TIME' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    ตรงเวลา
                                                </span>
                                            )}
                                            {log.status === 'LATE' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                    เข้างานสาย
                                                </span>
                                            )}
                                            {log.status === 'OUT_OF_LOCATION' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                    นอกสถานที่
                                                </span>
                                            )}
                                            {log.status === 'ABSENT' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                                    ขาด/ลางาน
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <select
                                                className="text-xs border-gray-200 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5"
                                                value={log.status}
                                                onChange={(e) => handleStatusOverride(log.id, e.target.value)}
                                            >
                                                <option value="ON_TIME">✅ ปรับเป็น ตรงเวลา</option>
                                                <option value="LATE">🚨 ปรับเป็น สาย</option>
                                                <option value="OUT_OF_LOCATION">🌍 ปรับเป็น นอกสถานที่</option>
                                                <option value="ABSENT">❌ ปรับเป็น ขาดงาน</option>
                                            </select>
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
