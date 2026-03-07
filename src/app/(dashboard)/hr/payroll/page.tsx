"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { CheckCircleIcon, XCircleIcon, BanknotesIcon, CalculatorIcon, DocumentCheckIcon, UserGroupIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function PayrollWizardPage() {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
    const [activeStep, setActiveStep] = useState(1);

    // Modal states for Step 2
    const [editingPayroll, setEditingPayroll] = useState<any>(null);
    const [editForm, setEditForm] = useState({ otherIncome: 0, bonus: 0, deductions: 0, socialSecurityDeduction: 0, taxDeduction: 0 });

    const { data: payrolls, error, isLoading, mutate } = useSWR(`/api/hr/payroll?month=${selectedMonth}`, fetcher);

    // Summary Calculations for Step 3
    const totalCashRequired = useMemo(() => {
        if (!payrolls) return 0;
        return payrolls.reduce((sum: number, p: any) => sum + (p.netSalary || 0) + (p.taxDeduction || 0) + ((p.socialSecurityDeduction || 0) * 2), 0);
    }, [payrolls]);

    const totalNetPay = useMemo(() => payrolls?.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0) || 0, [payrolls]);
    const totalWithholdingTax = useMemo(() => payrolls?.reduce((sum: number, p: any) => sum + (p.taxDeduction || 0), 0) || 0, [payrolls]);
    const totalSSO = useMemo(() => payrolls?.reduce((sum: number, p: any) => sum + ((p.socialSecurityDeduction || 0) * 2), 0) || 0, [payrolls]); // Employer + Employee


    const handleGeneratePayroll = async () => {
        try {
            const res = await fetch("/api/hr/payroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month: selectedMonth }),
            });
            if (res.ok) {
                mutate();
                setActiveStep(2); // Move to Editor Step
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllPaid = async () => {
        if (!payrolls) return;
        const unpaid = payrolls.filter((p: any) => p.status === "UNPAID");
        if (unpaid.length === 0) {
            alert("No unpaid payrolls found.");
            return;
        }

        try {
            await Promise.all(unpaid.map((p: any) =>
                fetch(`/api/hr/payroll/${p.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "PAID" })
                })
            ));
            mutate();
            setActiveStep(4); // Move to Success Step
        } catch (error) {
            console.error(error);
            alert("Failed to disburse payrolls.");
        }
    };

    const handleOpenEdit = (payroll: any) => {
        setEditingPayroll(payroll);
        setEditForm({
            otherIncome: payroll.otherIncome || 0,
            bonus: payroll.bonus || 0,
            deductions: payroll.deductions || 0, // Student Loans
            socialSecurityDeduction: payroll.socialSecurityDeduction || 0,
            taxDeduction: payroll.taxDeduction || 0
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayroll) return;
        try {
            const res = await fetch(`/api/hr/payroll/${editingPayroll.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    otherIncome: Number(editForm.otherIncome),
                    bonus: Number(editForm.bonus),
                    deductions: Number(editForm.deductions),
                    socialSecurityDeduction: Number(editForm.socialSecurityDeduction),
                    taxDeduction: Number(editForm.taxDeduction)
                })
            });
            if (res.ok) {
                setEditingPayroll(null);
                mutate();
            } else {
                alert("Failed to save adjustments.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/50">
            {/* Header / Meta */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <BanknotesIcon className="w-10 h-10 text-indigo-600" />
                        Run Payroll
                    </h1>
                    <p className="mt-2 text-slate-500 font-medium">Automated PND.1, SSO calculations, and Ledger synchronization.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <span className="text-sm font-bold text-slate-600 pl-3">Pay Period:</span>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => { setSelectedMonth(e.target.value); setActiveStep(1); }}
                        className="px-4 py-2 border-none bg-slate-100/50 rounded-lg text-sm font-semibold text-slate-800 focus:ring-0 outline-none cursor-pointer"
                    />
                </div>
            </div>

            {/* Step Indicator */}
            <div className="mb-10 w-full px-4">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0 rounded-full"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 z-0 rounded-full transition-all duration-500" style={{ width: `${((activeStep - 1) / 3) * 100}%` }}></div>

                    {[
                        { step: 1, label: "Initialize", icon: CalculatorIcon },
                        { step: 2, label: "Adjustments", icon: UserGroupIcon },
                        { step: 3, label: "Tax Review", icon: DocumentCheckIcon },
                        { step: 4, label: "Disburse", icon: CheckCircleIcon }
                    ].map((s) => (
                        <div key={s.step} className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer" onClick={() => activeStep > s.step && setActiveStep(s.step)}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${activeStep >= s.step ? 'bg-indigo-600 border-indigo-100 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 text-slate-400'}`}>
                                <s.icon className="w-5 h-5" strokeWidth={activeStep >= s.step ? 2.5 : 2} />
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${activeStep >= s.step ? 'text-indigo-900' : 'text-slate-400'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ----------------- STEP 1: INITIALIZE ----------------- */}
            {activeStep === 1 && (
                <div className="bg-white rounded-3xl p-10 shadow-xl shadow-indigo-100/20 border border-slate-100 flex flex-col items-center justify-center text-center max-w-3xl mx-auto mt-12 fade-in">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                        <CalculatorIcon className="w-12 h-12 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Initialize {selectedMonth} Payroll Engine</h2>
                    <p className="text-slate-500 mb-8 max-w-md">Our algorithm will scan YTD incomes, calculate precise PND.1 progressive brackets, apply Date-Aware SSO ceilings, and log OT autonomously.</p>

                    {isLoading ? (
                        <div className="animate-pulse flex gap-2 items-center text-indigo-600 font-bold">
                            <div className="w-2 h-2 rounded-full bg-indigo-600"></div> Loading...
                        </div>
                    ) : (payrolls && payrolls.length > 0) ? (
                        <div className="space-y-4 w-full">
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl flex items-center justify-center gap-2 font-semibold">
                                <CheckCircleIcon className="w-5 h-5" /> Payroll records already exist for this month.
                            </div>
                            <button onClick={() => setActiveStep(2)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                Proceed to Adjustments ➔
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleGeneratePayroll} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all hover:-translate-y-0.5">
                            Run AI Payroll Generator
                        </button>
                    )}
                </div>
            )}

            {/* ----------------- STEP 2: ADJUSTMENTS ----------------- */}
            {activeStep === 2 && (
                <div className="space-y-6 fade-in">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Review & Adjustments</h2>
                            <p className="text-slate-500">Manually override OT, Bonuses, or Student Loans (กยศ.) before locking.</p>
                        </div>
                        <button onClick={() => setActiveStep(3)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                            Next: Tax Review ➔
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Base Salary</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Bonuses & OT</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Student Loan / Deducts</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Net Payable</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {payrolls?.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold">
                                                        {(p.employee?.user?.name || "U")[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{p.employee?.user?.name || "Unknown"}</div>
                                                        <div className="text-xs text-slate-400">{p.employee?.position || "Staff"}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium text-right">
                                                ฿{p.baseSalary.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <div className="text-emerald-600 font-bold">+฿{((p.otAmount || 0) + (p.bonus || 0) + (p.otherIncome || 0)).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <div className="text-rose-500 font-bold">-฿{(p.deductions || 0).toLocaleString()}</div>
                                                {p.deductions > 0 && <div className="text-[10px] text-rose-300">กยศ. Active</div>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-slate-900 border-l border-slate-100 bg-slate-50/50">
                                                ฿{p.netSalary.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button onClick={() => handleOpenEdit(p)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                                    Edit Variables
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------- STEP 3: TAX & SSO SUMMARY ----------------- */}
            {activeStep === 3 && (
                <div className="space-y-8 fade-in">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Tax & Compliance Review</h2>
                            <p className="text-slate-500">Verify the algorithmic PND.1 progressive brackets and Date-Aware SSO matching.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setActiveStep(2)} className="bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all">
                                ➔ Back
                            </button>
                            <button onClick={handleMarkAllPaid} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">
                                Disburse Payroll 🚀
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl shadow-xl shadow-indigo-200 text-white md:col-span-1 flex flex-col justify-between">
                            <div>
                                <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Total Cash Required</p>
                                <h3 className="text-4xl font-black mb-1">฿{totalCashRequired.toLocaleString()}</h3>
                                <p className="text-indigo-200 text-xs">Amount needed in corporate bank account to clear liabilities.</p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-indigo-500/30">
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="text-indigo-200">Net Payable to Staff</span>
                                    <span className="font-bold">฿{totalNetPay.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="text-indigo-200">Withholding Tax (PND.1)</span>
                                    <span className="font-bold">฿{totalWithholdingTax.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-indigo-200">SSO Liability (Both pairs)</span>
                                    <span className="font-bold">฿{totalSSO.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 md:col-span-3 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                                <DocumentCheckIcon className="w-6 h-6 text-slate-400" />
                                <h3 className="font-bold text-slate-800">Individual Tax Ledger</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[400px]">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Employee</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase">Withholding Tax (PND.1)</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase">Employee SSO</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-amber-500 uppercase">Employer SSO Match</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {payrolls?.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 text-sm font-bold text-slate-700">{p.employee?.user?.name}</td>
                                                <td className="px-6 py-3 text-sm text-right text-rose-500 font-medium">฿{p.taxDeduction?.toLocaleString() || 0}</td>
                                                <td className="px-6 py-3 text-sm text-right text-indigo-600 font-medium">฿{p.socialSecurityDeduction?.toLocaleString() || 0}</td>
                                                <td className="px-6 py-3 text-sm text-right text-amber-600 font-bold bg-amber-50/30">฿{p.socialSecurityDeduction?.toLocaleString() || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------- STEP 4: SUCCESS ----------------- */}
            {activeStep === 4 && (
                <div className="bg-white rounded-3xl p-12 shadow-xl shadow-emerald-100/30 border border-slate-100 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-12 fade-in">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50">
                        <CheckCircleIcon className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-3">Payroll Disbursed!</h2>
                    <p className="text-slate-500 mb-8 max-w-md text-lg">All transactions correctly mapped to the core ledger. Payslips have been populated into AES-256 Vaults.</p>
                    <button onClick={() => window.location.href = '/finance/ledger'} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5">
                        View Immutable General Ledger
                    </button>
                </div>
            )}

            {/* EDIT MODAL DRAWER (Used in Step 2) */}
            {editingPayroll && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-8 relative shadow-2xl border border-slate-200">
                        <button onClick={() => setEditingPayroll(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
                            <XCircleIcon className="w-7 h-7" />
                        </button>
                        <h3 className="text-2xl font-black text-slate-800 mb-1">Manual Adjustments</h3>
                        <p className="text-sm font-medium text-slate-500 mb-6 flex items-center gap-2">
                            <UserGroupIcon className="w-4 h-4" /> {editingPayroll.employee?.user?.name}
                        </p>

                        <form onSubmit={handleSaveEdit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Overtime / Bonuses</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                        <input type="number" value={editForm.bonus} onChange={(e) => setEditForm(prev => ({ ...prev, bonus: Number(e.target.value) }))} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Other Incomes (Tax-Free)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                        <input type="number" value={editForm.otherIncome} onChange={(e) => setEditForm(prev => ({ ...prev, otherIncome: Number(e.target.value) }))} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Loans (กยศ.)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 font-bold">฿</span>
                                        <input type="number" value={editForm.deductions} onChange={(e) => setEditForm(prev => ({ ...prev, deductions: Number(e.target.value) }))} className="w-full pl-9 pr-4 py-3 bg-rose-50 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none font-bold text-rose-800 transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">PND.1 Tax <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 rounded">Auto</span></label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                        <input type="number" value={editForm.taxDeduction} onChange={(e) => setEditForm(prev => ({ ...prev, taxDeduction: Number(e.target.value) }))} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setEditingPayroll(null)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl hover:shadow-indigo-200 transition-all">Apply Overrides</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
