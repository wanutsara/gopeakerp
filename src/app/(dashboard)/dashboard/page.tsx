import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "./DashboardCharts";
import {
    UsersIcon,
    BanknotesIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    SpeakerWaveIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    PresentationChartLineIcon
} from "@heroicons/react/24/outline";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    // --- 1. HR & Payroll Data (The Talent Engine) ---
    const employees = await prisma.employee.findMany();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const activeLeavesToday = await prisma.leaveRequest.count({
        where: {
            status: "APPROVED",
            startDate: { lte: endOfDay },
            endDate: { gte: startOfDay }
        }
    });

    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const currentMonthPayrolls = await prisma.payroll.findMany({
        where: { month: currentMonthStr }
    });

    const monthAttendances = await prisma.attendance.findMany({
        where: {
            date: { gte: startOfMonth, lte: endOfMonth },
            checkIn: { not: null }
        }
    });

    let totalPayroll = 0;
    const positionPayrollAccumulator: Record<string, number> = {};

    if (currentMonthPayrolls.length > 0) {
        currentMonthPayrolls.forEach(payroll => {
            totalPayroll += payroll.netSalary;
            const emp = employees.find(e => e.id === payroll.employeeId);
            const pos = emp?.position || "ไม่ได้ระบุตำแหน่ง";
            if (!positionPayrollAccumulator[pos]) positionPayrollAccumulator[pos] = 0;
            positionPayrollAccumulator[pos] += payroll.netSalary;
        });
    } else {
        employees.forEach(emp => {
            let daysWorked = 0;
            if (emp.employeeType !== 'MONTHLY') {
                const empAttendance = monthAttendances.filter(a => a.employeeId === emp.id);
                const uniqueDays = new Set(empAttendance.map(a => new Date(a.date).toISOString().split('T')[0]));
                daysWorked = uniqueDays.size;
            }
            let approxMonthlyWage = emp.employeeType === 'MONTHLY' ? emp.wageRate : (emp.wageRate * daysWorked);
            totalPayroll += approxMonthlyWage;
            const pos = emp.position || "ไม่ได้ระบุตำแหน่ง";
            if (!positionPayrollAccumulator[pos]) positionPayrollAccumulator[pos] = 0;
            positionPayrollAccumulator[pos] += approxMonthlyWage;
        });
    }

    // --- 2. Revenue & Marketing Data (The Growth Engine) ---
    const thisMonthOrders = await ((prisma as any).order?.findMany({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
    }) || Promise.resolve([]));

    // Revenue calculations
    const fulfilledOrders = (thisMonthOrders || []).filter((o: any) => o.status !== 'CANCELLED');
    const totalRevenue = fulfilledOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);

    // Ad Spend calculations
    const thisMonthAdLogs = await ((prisma as any).adSpendLog?.findMany({
        where: { date: { gte: startOfMonth, lte: endOfMonth } }
    }) || Promise.resolve([]));
    const totalAdSpend = (thisMonthAdLogs || []).reduce((sum: number, log: any) => sum + (log.spend || 0), 0);

    // Metrics
    const currentROAS = totalAdSpend > 0 ? (totalRevenue / totalAdSpend).toFixed(2) : "0.00";
    const netProfit = totalRevenue - totalAdSpend - totalPayroll;
    const netProfitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const isProfitable = netProfit >= 0;

    // --- Chart Data ---
    const chartData = {
        labels: Object.keys(positionPayrollAccumulator),
        datasets: [
            {
                data: Object.values(positionPayrollAccumulator),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                    '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
                ],
                borderWidth: 0,
                hoverOffset: 4
            },
        ],
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            {/* Header */}
            <div className="bg-white p-6 rounded-3xl shadow-lg shadow-gray-200/40 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <PresentationChartLineIcon className="w-10 h-10 text-indigo-600" />
                        Executive Dashboard
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 font-medium">
                        ศูนย์บัญชาการวิเคราะห์ข้อมูลองค์กรแบบเรียลไทม์ (Command Center)
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-indigo-50 text-indigo-700 shadow-sm">
                        Performance: {today.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">Auto-synced with ERP Database</span>
                </div>
            </div>

            {/* Pillar 1: Financial & Revenue KPI Cards */}
            <h2 className="text-xl font-bold text-gray-800 border-l-4 border-indigo-500 pl-3">The Growth Engine (รายได้ & การตลาด)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Revenue Card */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl shadow-xl shadow-green-500/20 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-white/20 transition duration-500"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <CurrencyDollarIcon className="w-6 h-6 text-green-50" />
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">Total Revenue</span>
                    </div>
                    <h3 className="text-4xl font-black relative z-10 mb-1">
                        <span className="text-xl opacity-80 mr-1">฿</span>
                        {totalRevenue.toLocaleString()}
                    </h3>
                    <p className="text-green-100 text-sm font-medium relative z-10">ยอดขายรวมสุทธิเดือนนี้</p>
                </div>

                {/* Net Profit Card */}
                <div className={`p-6 rounded-3xl shadow-xl relative overflow-hidden group text-white ${isProfitable ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20' : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-white/20 transition duration-500"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            {isProfitable ? <ArrowTrendingUpIcon className="w-6 h-6 text-blue-50" /> : <ArrowTrendingDownIcon className="w-6 h-6 text-rose-50" />}
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">Net Profit</span>
                    </div>
                    <h3 className="text-4xl font-black relative z-10 mb-1">
                        <span className="text-xl opacity-80 mr-1">฿</span>
                        {netProfit.toLocaleString()}
                    </h3>
                    <p className="text-blue-100 text-sm font-medium relative z-10 flex items-center justify-between">
                        กำไรสุทธิ (หักค่าแอด & ค่าแรง)
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-black">{netProfitMargin}% Margin</span>
                    </p>
                </div>

                {/* Ad Spend Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center relative transition hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">
                            <SpeakerWaveIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ad Spend</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">
                        <span className="text-lg text-gray-400 mr-1">฿</span>{totalAdSpend.toLocaleString()}
                    </h3>
                    <p className="text-sm font-medium text-gray-500">ค่าโฆษณารวมทุกแพลตฟอร์ม</p>
                </div>

                {/* ROAS Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center relative transition hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                            <ArrowTrendingUpIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ROAS</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-gray-900 mb-1">
                            {currentROAS}
                        </h3>
                        <span className="text-lg font-bold text-gray-400">x</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">ผลตอบแทนค่าโฆษณา (Return on Ad Spend)</p>
                </div>

            </div>

            {/* Pillar 2: Resources & Operations */}
            <h2 className="text-xl font-bold text-gray-800 border-l-4 border-indigo-500 pl-3 mt-10">The Execution Engine (ทรัพยากรบุคคล & ปฏิบัติการ)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Payroll Estimator */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gray-100 text-gray-600 rounded-2xl">
                            <BanknotesIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">OpEx</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">
                        <span className="text-lg text-gray-400 mr-1">฿</span>{totalPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                    <p className="text-sm font-medium text-gray-500">ประมาณการเงินเดือนพนักงานรวม</p>
                </div>

                {/* Headcount */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">
                        {employees.length} <span className="text-lg font-bold text-gray-400">บุคลากร</span>
                    </h3>
                    <p className="text-sm font-medium text-gray-500">กำลังพลทั้งหมดในบริษัท (Headcount)</p>
                </div>

                {/* Leaves */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">
                        {activeLeavesToday} <span className="text-lg font-bold text-gray-400">คน</span>
                    </h3>
                    <p className="text-sm font-medium text-gray-500">พนักงานที่ลางานในวันนี้ (Capacity Risk)</p>
                </div>

            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center justify-between">
                        โครงสร้างงบเงินเดือน
                        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">ตามตำแหน่ง</span>
                    </h3>
                    {employees.length > 0 ? (
                        <div className="w-full flex justify-center relative min-h-[250px] items-center">
                            <DashboardCharts data={chartData} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <UsersIcon className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm font-medium">ไม่มีข้อมูลพนักงาน</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center justify-between">
                        กราฟแนวโน้มยอดขาย vs ค่าโฆษณา
                        <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded flex items-center gap-1">📍 Next Update</span>
                    </h3>
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center transition hover:bg-gray-50">
                        <PresentationChartLineIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <h4 className="text-gray-700 font-bold mb-2 text-lg">รวบรวมข้อมูล Transaction (Awaiting Data)</h4>
                        <p className="text-sm text-gray-500 max-w-sm">
                            โมดูลกราฟแนวโน้มรายได้แบบรายวันจะแสดงผลที่นี่ เมื่อระบบเริ่มบันทึกข้อมูล <b>Sales Orders</b> และ <b>Ad Spend</b> เข้ามาใน <b>Command Center</b> แบบสม่ำเสมอ
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
