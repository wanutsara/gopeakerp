"use client";

import useSWR from "swr";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, BanknotesIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
};

export default function CashFlowMap() {
    const { data: flow, error } = useSWR("/api/finance/cashflow-sankey", fetcher);

    if (error) return <div className="p-8 text-red-500">Failed to load Cash Flow Map.</div>;
    if (!flow) return <div className="p-8 text-gray-500 animate-pulse">Computing Financial Vectors...</div>;

    const totalIn = flow.totalIncome || 1; // Prevent div by zero in UI bars

    // Helper to calculate bar width relative to total income
    const getWidth = (val: number) => {
        const pct = (val / totalIn) * 100;
        return pct > 100 ? '100%' : `${Math.max(pct, 2)}%`;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">แผนผังกระแสเงินสด (Cash Flow Map)</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Sankey Pipeline Visualization (ย้อนหลัง 30 วัน): ติดตามเส้นทางว่าเงินรายได้ไหลออกไปทางไหนบ้าง
                </p>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 xl:p-12 shadow-2xl relative overflow-hidden">
                {/* Visual Background grid */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 bg-center"></div>

                <div className="relative z-10 flex flex-col gap-8">

                    {/* TOP LEVEL: Income */}
                    <div className="flex flex-col mb-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="bg-green-500/20 p-3 rounded-xl border border-green-500/30">
                                <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">เงินสดรับเข้า (Total Inflow)</h3>
                                <p className="text-gray-400 text-sm">รายได้จากการขายทั้งหมด</p>
                            </div>
                            <div className="ml-auto text-right">
                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-500">
                                    ฿{flow.totalIncome.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
                            <div className="bg-green-500 h-full rounded-full w-full"></div>
                        </div>
                    </div>

                    {/* MID LEVEL: Expenses Distribution */}
                    <div className="pl-12 border-l-2 border-gray-800 space-y-6 relative py-4">
                        <div className="absolute left-[-2px] top-1/2 h-full w-[2px] bg-gradient-to-b from-gray-800 to-transparent transform -translate-y-1/2"></div>

                        <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest pl-2 mb-2">
                            ไหลออกสู่ค่าใช้จ่าย (Outflows)
                        </h4>

                        <ExpenseNode
                            title="ต้นทุนสินค้า (COGS)"
                            amount={flow.expenses.cogs}
                            pct={getWidth(flow.expenses.cogs)}
                            color="bg-orange-500"
                            textColor="text-orange-400"
                        />
                        <ExpenseNode
                            title="งบโฆษณา (Ad Spend)"
                            amount={flow.expenses.ads}
                            pct={getWidth(flow.expenses.ads)}
                            color="bg-blue-500"
                            textColor="text-blue-400"
                        />
                        <ExpenseNode
                            title="เงินเดือนพนักงาน (Payroll)"
                            amount={flow.expenses.payroll}
                            pct={getWidth(flow.expenses.payroll)}
                            color="bg-purple-500"
                            textColor="text-purple-400"
                        />
                        <ExpenseNode
                            title="ค่าขนส่ง (Shipping)"
                            amount={flow.expenses.shipping}
                            pct={getWidth(flow.expenses.shipping)}
                            color="bg-yellow-500"
                            textColor="text-yellow-400"
                        />
                        <ExpenseNode
                            title="ค่าใช้จ่ายอื่นๆ (Operational)"
                            amount={flow.expenses.operational}
                            pct={getWidth(flow.expenses.operational)}
                            color="bg-gray-400"
                            textColor="text-gray-300"
                        />
                    </div>

                    {/* BOTTOM LEVEL: Net Cash */}
                    <div className="flex flex-col mt-4 pt-8 border-t border-gray-800">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                                <BanknotesIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">กระแสเงินสดสุทธิ (Net Cash Flow)</h3>
                                <p className="text-gray-400 text-sm">เงินคงเหลือเข้ากระเป๋าบริษัท</p>
                            </div>
                            <div className="ml-auto text-right">
                                <span className={`text-5xl font-black text-transparent bg-clip-text ${flow.netCash >= 0 ? 'bg-gradient-to-r from-emerald-300 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-600'}`}>
                                    {flow.netCash < 0 ? '-' : ''}฿{Math.abs(flow.netCash).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
                            <div
                                className={`${flow.netCash >= 0 ? 'bg-emerald-500' : 'bg-red-500'} h-full rounded-full transition-all duration-1000 ease-out`}
                                style={{ width: getWidth(Math.abs(flow.netCash)) }}
                            ></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Sub-component for rendering the bars
function ExpenseNode({ title, amount, pct, color, textColor }: { title: string, amount: number, pct: string, color: string, textColor: string }) {
    return (
        <div className="flex flex-col relative group">
            {/* Visual connector line curve */}
            <div className="absolute -left-12 top-6 w-10 h-10 border-b-2 border-l-2 border-gray-700/50 rounded-bl-3xl"></div>

            <div className="flex items-end justify-between mb-1 pl-2">
                <span className={`font-bold text-sm ${textColor}`}>{title}</span>
                <span className="text-white font-medium text-lg">฿{amount.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-800/80 rounded-r-full h-8 overflow-hidden backdrop-blur-sm border border-gray-700/50 group-hover:border-gray-600 transition-colors">
                <div
                    className={`${color} h-full transition-all duration-1000 ease-out flex items-center shadow-lg`}
                    style={{ width: amount === 0 ? '0%' : pct }}
                >
                    {amount > 0 && <span className="ml-2 text-[10px] font-black text-white/70">{(parseFloat(pct)).toFixed(1)}%</span>}
                </div>
            </div>
        </div>
    );
}
