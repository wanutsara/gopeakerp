import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteEmployeeButton from "./DeleteEmployeeButton";

export default async function HRPage() {
    // Fetch employees
    const employees = await prisma.employee.findMany({
        include: {
            user: true,
            department: true,
        },
        orderBy: {
            user: {
                name: "asc",
            },
        },
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ระบบจัดการบุคลากร (HR)</h1>
                    <p className="mt-1 text-sm text-gray-500">จัดการรายชื่อพนักงาน ข้อมูลส่วนตัว และอัตราค่าจ้าง</p>
                </div>
                <Link
                    href="/hr/create"
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow hover:bg-blue-700 transition"
                >
                    + เพิ่มพนักงานใหม่
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">พนักงาน</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ตำแหน่ง / แผนก</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ประเภท</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">อัตราค่าจ้าง</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                        ยังไม่มีข้อมูลพนักงาน
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {emp.image ? (
                                                    <img src={emp.image} alt={emp.user.name || "Employee"} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold uppercase">
                                                        {emp.user.name?.[0] || emp.user.email?.[0] || "?"}
                                                    </div>
                                                )}
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{emp.user.name}</div>
                                                    <div className="text-sm text-gray-500">{emp.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{emp.position || "-"}</div>
                                            <div className="text-sm text-gray-500">{emp.department?.name || "ไม่ระบุแผนก"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.employeeType === 'MONTHLY' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                {emp.employeeType === 'MONTHLY' ? 'รายเดือน' : 'รายวัน'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            ฿{emp.wageRate.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {emp.status === 'ACTIVE' ? 'ทำงานอยู่' : 'ลาออก'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={`/hr/${emp.id}`} className="text-blue-600 hover:text-blue-900 inline-flex items-center">
                                                แก้ไข
                                            </Link>
                                            <DeleteEmployeeButton employeeId={emp.id} employeeName={emp.user.name || "ไม่ระบุ"} />
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
