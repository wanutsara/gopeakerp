"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PayrollAllocationDashboard() {
    const { data, mutate, error, isLoading } = useSWR('/api/hr/payroll-allocation', fetcher);
    const [allocations, setAllocations] = useState<Record<string, Record<string, number>>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Sync initial state from DB
    useEffect(() => {
        if (data?.hqEmployees) {
            const initialMap: Record<string, Record<string, number>> = {};
            data.hqEmployees.forEach((emp: any) => {
                initialMap[emp.id] = emp.payrollAllocation || {};
            });
            setAllocations(initialMap);
        }
    }, [data]);

    const handleAllocationChange = (employeeId: string, subsidiaryId: string, value: number) => {
        setAllocations(prev => ({
            ...prev,
            [employeeId]: {
                ...(prev[employeeId] || {}),
                [subsidiaryId]: value
            }
        }));
    };

    const getRemainingPercentage = (employeeId: string) => {
        const empAlloc = allocations[employeeId] || {};
        const allocated = Object.values(empAlloc).reduce((sum, val) => sum + (Number(val) || 0), 0);
        return 100 - allocated;
    };

    const handleSaveMatrix = async () => {
        setIsSaving(true);
        const loading = toast.loading("กำลังอัพเดตสัดส่วนค่าใช้จ่ายบุคคลากร...");

        // Validate
        const invalidEmps = Object.keys(allocations).filter(empId => getRemainingPercentage(empId) < 0);
        if (invalidEmps.length > 0) {
            toast.error("มีพนักงานบางคนถูกแบ่งสัดส่วนเกิน 100%", { id: loading });
            setIsSaving(false);
            return;
        }

        const payload = Object.keys(allocations).map(empId => ({
            employeeId: empId,
            mapping: allocations[empId]
        }));

        try {
            const res = await fetch('/api/hr/payroll-allocation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allocations: payload })
            });

            if (res.ok) {
                toast.success("บันทึกสัดส่วนสำเร็จ!", { id: loading });
                mutate();
            } else {
                toast.error("บันทึกข้อมูลล้มเหลว", { id: loading });
            }
        } catch (e) {
            toast.error("Network Error", { id: loading });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8"><div className="animate-pulse bg-gray-100 h-96 w-full rounded-3xl"></div></div>;
    if (error) return <div className="p-8 text-red-500 font-bold">Failed to load HR matrix.</div>;

    const currencyFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Intercompany HR Matrix
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Cost Center Allocation</h1>
                    <p className="mt-2 text-sm text-gray-500 max-w-xl">
                        HQ Shared Service employees incur payroll costs. Distribute these expenses dynamically to subsidiary P&Ls (Tamaya / SameSame) based on time/effort percentage ratios.
                    </p>
                </div>

                <div className="relative z-10">
                    <button
                        onClick={handleSaveMatrix}
                        disabled={isSaving}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-full shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        Save Master Allocation
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-400 font-black uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-3xl">HQ Employee</th>
                                <th className="px-6 py-4">Base Salary</th>
                                <th className="px-6 py-4 text-center">Unallocated To HQ</th>
                                {data?.subsidiaries.map((sub: any) => (
                                    <th key={sub.id} className="px-6 py-4 bg-indigo-50/50 text-indigo-800 text-center border-l border-indigo-100/50">
                                        Distribute to {sub.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data?.hqEmployees.map((emp: any) => {
                                const remainingHQ = getRemainingPercentage(emp.id);
                                const isInvalid = remainingHQ < 0;

                                return (
                                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-600 overflow-hidden shrink-0">
                                                    {emp.image ? <img src={emp.image} className="w-full h-full object-cover" /> : emp.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-gray-900">{emp.user.name}</span>
                                                    <span className="block text-xs text-gray-500">{emp.position || 'Shared Admin'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-gray-600">
                                            {currencyFormatter.format(emp.wageRate)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black ${isInvalid ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {remainingHQ}%
                                            </span>
                                            <span className="block text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest block">Remains at HQ</span>
                                        </td>

                                        {data?.subsidiaries.map((sub: any) => {
                                            const val = allocations[emp.id]?.[sub.id] || 0;
                                            return (
                                                <td key={sub.id} className="px-6 py-4 border-l border-indigo-50 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden w-20">
                                                            <input
                                                                type="number"
                                                                min="0" max="100"
                                                                value={val}
                                                                onChange={(e) => handleAllocationChange(emp.id, sub.id, parseInt(e.target.value) || 0)}
                                                                className="w-full bg-transparent border-none text-center font-black p-2 focus:ring-0 text-indigo-700"
                                                            />
                                                            <span className="text-gray-400 font-bold pr-2">%</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mt-1">
                                                            → {currencyFormatter.format((emp.wageRate * val) / 100)}
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {data?.hqEmployees.length === 0 && (
                                <tr>
                                    <td colSpan={100} className="py-20 text-center text-gray-400 font-bold">
                                        No HQ Shared Service Employees Found. <br /> Assign staff to the HQ entity first.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
