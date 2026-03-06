"use client";

import useSWR from 'swr';
import { useBrand } from '@/context/BrandContext';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FinanceDashboard() {
    const { activeBrandId, brands } = useBrand();

    const endpoint = activeBrandId
        ? `/api/finance/analytics?brandId=${activeBrandId}`
        : `/api/finance/analytics`;

    const { data, error, isLoading } = useSWR(endpoint, fetcher);
    const activeBrand = activeBrandId ? brands.find(b => b.id === activeBrandId) : null;

    const currencyFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

    if (isLoading) return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="h-32 bg-gray-100 animate-pulse rounded-[2rem]"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-[2rem]"></div>)}
            </div>
            <div className="h-96 bg-gray-100 animate-pulse rounded-[2rem]"></div>
        </div>
    );

    if (error) return <div className="p-8 text-center text-red-500 font-bold">Failed to load financial data.</div>;

    const grossMargin = data.cashReceived - data.totalExpenses;

    // Charts Config
    const expenseChartData = {
        labels: data.expenseDistribution.map((e: any) => e.category),
        datasets: [{
            data: data.expenseDistribution.map((e: any) => e.amount),
            backgroundColor: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'],
            borderWidth: 0,
        }]
    };

    const channelSalesData = {
        labels: data.channelSales.map((c: any) => c.channel),
        datasets: [{
            label: 'Revenue (THB)',
            data: data.channelSales.map((c: any) => c.revenue),
            backgroundColor: '#4F46E5',
            borderRadius: 8,
        }]
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">

            {/* Context Headline */}
            <div className={`p-8 rounded-[2rem] border shadow-sm relative overflow-hidden text-white transition-colors duration-500
                ${!activeBrandId ? 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 border-indigo-700' :
                    (activeBrand?.isHQ ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-800 border-emerald-600')}`}
            >
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            Live P&L Tracking
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">
                            {!activeBrandId ? 'Consolidated Organization' : activeBrand?.name}
                        </h1>
                        <p className="mt-2 text-sm font-medium text-white/70">
                            {activeBrandId ? `Isolated Financial View for ${activeBrand?.name}` : 'Multi-Entity Cross-Brand Aggregation'}
                        </p>
                    </div>

                    <div className="text-right bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 border-t-white/40">
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider block mb-1">Net Margin (computed)</span>
                        <span className="text-4xl font-black tracking-tighter shadow-sm">{currencyFormatter.format(grossMargin)}</span>
                    </div>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue Inflows</span>
                    <span className="text-3xl font-black text-indigo-700 mt-4 tracking-tighter">{currencyFormatter.format(data.cashReceived)}</span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Accounts Receivable (Awaiting)</span>
                    <span className="text-3xl font-black text-amber-600 mt-4 tracking-tighter">{currencyFormatter.format(data.accountsReceivable)}</span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expenses Disbursed</span>
                    <span className="text-3xl font-black text-rose-600 mt-4 tracking-tighter">{currencyFormatter.format(data.totalExpenses)}</span>
                </div>

                <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">EBITDA Margin Estimate</span>
                    <span className="text-3xl font-black text-emerald-400 mt-4 tracking-tighter">
                        {data.cashReceived > 0 ? ((grossMargin / data.cashReceived) * 100).toFixed(1) + '%' : '0.0%'}
                    </span>
                </div>

            </div>

            {/* Visual Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

                {/* Channels */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-6">Omnichannel Revenue Matrix</h3>
                    <div className="h-64">
                        <Bar
                            data={channelSalesData}
                            options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                        />
                    </div>
                </div>

                {/* Expenses */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-6">Cost Center Allocation</h3>
                    {data.expenseDistribution.length > 0 ? (
                        <div className="h-64 relative">
                            <Doughnut
                                data={expenseChartData}
                                options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '75%' }}
                            />
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-3xl">
                            <span>No Expense Data</span>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}
