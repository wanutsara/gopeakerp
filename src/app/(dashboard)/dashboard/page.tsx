import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "./DashboardCharts";
import { UsersIcon, BanknotesIcon, CalendarIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    // Fetch employees and calculate payroll data
    const employees = await prisma.employee.findMany();

    // Fetch today's leaves
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
    const currentMonthPayrolls = await prisma.payroll.findMany({
        where: { month: currentMonthStr }
    });

    let totalPayroll = 0;
    const positionPayrollAccumulator: Record<string, number> = {};

    if (currentMonthPayrolls.length > 0) {
        // Use exact generated payroll amounts
        currentMonthPayrolls.forEach(payroll => {
            totalPayroll += payroll.netSalary;
            const emp = employees.find(e => e.id === payroll.employeeId);
            const pos = emp?.position || "ไม่ได้ระบุตำแหน่ง";
            if (!positionPayrollAccumulator[pos]) positionPayrollAccumulator[pos] = 0;
            positionPayrollAccumulator[pos] += payroll.netSalary;
        });
    } else {
        // Fallback to estimation if not yet generated
        employees.forEach(emp => {
            let approxMonthlyWage = emp.employeeType === 'MONTHLY' ? emp.wageRate : (emp.wageRate * 22);
            totalPayroll += approxMonthlyWage;

            const pos = emp.position || "ไม่ได้ระบุตำแหน่ง";
            if (!positionPayrollAccumulator[pos]) positionPayrollAccumulator[pos] = 0;
            positionPayrollAccumulator[pos] += approxMonthlyWage;
        });
    }

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
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ภาพรวมธุรกิจ (Dashboard)</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        ยินดีต้อนรับกลับมา, <span className="font-semibold text-blue-600">{session.user?.name}</span>
                    </p>
                </div>
                <div className="hidden sm:block">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                        อัปเดตล่าสุด: {today.toLocaleDateString('th-TH')}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* KPI Cards */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <UsersIcon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">พนักงานทั้งหมด (HR)</p>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{employees.length} <span className="text-base font-normal text-gray-500">คน</span></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-center relative overflow-hidden transition hover:shadow-md">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-12 translate-x-12 mix-blend-multiply"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <BanknotesIcon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-blue-700">ประมาณการเงินเดือนรวม</p>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 relative z-10">
                        ฿{totalPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-center transition hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-orange-600">พนักงานที่ลางานวันนี้</p>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{activeLeavesToday} <span className="text-base font-normal text-gray-500">คน</span></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center opacity-50 relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-50 text-gray-500 rounded-lg">
                            <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">ยอดขาย/กำไรสุทธิ</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 rounded-2xl">
                        <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-3 py-1 rounded-full">อยู่ระหว่างพัฒนา</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-400 opacity-0">-</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center justify-between">
                        สัดส่วนเงินเดือน
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">ตามตำแหน่ง</span>
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

                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3">กราฟแนวโน้มยอดขาย vs ค่าโฆษณา</h3>
                    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-dashed border-gray-200">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h4 className="text-gray-500 font-medium mb-1">ยังไม่พร้อมใช้งานในเฟสปัจจุบัน</h4>
                        <p className="text-sm text-gray-400">ระบบอยู่ระหว่างการรวบรวมข้อมูล Transaction และรายได้</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
