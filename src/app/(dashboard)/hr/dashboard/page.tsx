"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HR10XDashboard() {
    const { data: analytics, error } = useSWR('/api/hr/analytics', fetcher);

    if (error) return <div className="p-8 text-red-500 font-bold">Failed to load HR Analytics Engine.</div>;
    if (!analytics) return (
        <div className="p-8 space-y-6">
            <div className="h-10 w-1/3 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>)}
            </div>
        </div>
    );

    // Prepare Doughnut Chart Data for Department Headcount
    const deptChartData = {
        labels: analytics.departments.map((d: any) => d.name),
        datasets: [{
            data: analytics.departments.map((d: any) => d.count),
            backgroundColor: [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
            ],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const currencyFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 tracking-tight">10X HR Control Tower</h1>
                    <p className="mt-1 text-sm font-medium text-gray-500">Live Strategic Organizational Intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">eNPS Vibe Check</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">😊</span>
                            <span className="text-lg font-black text-emerald-700">8.4<span className="text-sm font-bold text-emerald-500">/10</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core ROI KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Revenue Per Employee */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Revenue Per Head (10X Index)</h3>
                    <div className="text-3xl font-black text-gray-900">{currencyFormatter.format(analytics.revenuePerEmployee)}</div>
                    <div className="mt-3 text-xs font-bold flex items-center gap-1.5 text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Efficiency Metric
                    </div>
                </div>

                {/* Quest Velocity */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quest Velocity (Execution)</h3>
                    <div className="text-3xl font-black text-gray-900">{analytics.questVelocity}%</div>
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${analytics.questVelocity}%` }}></div>
                    </div>
                </div>

                {/* Total Payroll */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payroll Burn (MTD)</h3>
                    <div className="text-3xl font-black text-gray-900">{currencyFormatter.format(analytics.totalPayroll)}</div>
                    <div className="mt-3 text-xs font-bold text-rose-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        + {currencyFormatter.format(analytics.totalOT)} Overtime
                    </div>
                </div>

                {/* Live Attendance */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Live Attendance Today</h3>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-black text-gray-900">{analytics.attendanceRate}%</div>
                        <div className="text-sm font-bold text-gray-400">({analytics.activeEmployeesToday}/{analytics.headcount} Online)</div>
                    </div>
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${analytics.attendanceRate}%` }}></div>
                    </div>
                </div>

            </div>

            {/* Strategic Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Distribution Chart */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-extrabold text-gray-800 mb-6">Headcount Distribution</h3>
                    <div className="relative h-64 w-full flex justify-center items-center">
                        <Doughnut data={deptChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                        <div className="absolute flex flex-col items-center justify-center inset-0 pointer-events-none">
                            <span className="text-4xl font-black text-gray-900">{analytics.headcount}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total</span>
                        </div>
                    </div>
                    <div className="mt-6 space-y-2">
                        {analytics.departments.map((d: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-gray-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: deptChartData.datasets[0].backgroundColor[idx % 7] }}></span>
                                        {d.name}
                                    </span>
                                    <span className="font-black text-gray-900">{d.count} <span className="text-xs text-gray-400 font-bold ml-1">({Math.round((d.count / analytics.headcount) * 100)}%)</span></span>
                                </div>
                                {(d.totalSalary > 0 || d.totalExpense > 0) && (
                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 pl-4">
                                        <div className="flex gap-4">
                                            <span className="flex items-center gap-1.5"><span className="text-[10px]">💰</span>Payroll: {currencyFormatter.format(d.totalSalary)}</span>
                                            <span className="flex items-center gap-1.5 text-rose-500"><span className="text-[10px]">🧾</span>Exp: {currencyFormatter.format(d.totalExpense)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Flight Risk / Burnout Radar */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-rose-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none"></div>

                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                                <span className="text-rose-500">⚠️</span> Burnout & Flight Risk Radar
                            </h3>
                            <p className="text-xs font-medium text-gray-500 mt-1">AI tracking excessive Overtime across 30 days. High risk of resigning.</p>
                        </div>
                    </div>

                    {analytics.flightRisks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                            <span className="text-3xl mb-2">🌿</span>
                            <span className="text-sm font-bold text-emerald-700">Zero Critical Burnout Detected</span>
                            <span className="text-xs font-medium text-emerald-600 mt-1">The workforce operational load is perfectly balanced.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {analytics.flightRisks.map((risk: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50 hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${risk.riskLevel === 'CRITICAL' ? 'bg-gradient-to-br from-rose-500 to-red-600' :
                                            risk.riskLevel === 'HIGH' ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                                                'bg-gradient-to-br from-yellow-400 to-yellow-500'
                                            }`}>
                                            {risk.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors">{risk.name}</div>
                                            <div className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                {risk.department}
                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                <span className="text-rose-500">{risk.otHours} OT Hrs</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${risk.riskLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                                            risk.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {risk.riskLevel} FLIGHT RISK
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
