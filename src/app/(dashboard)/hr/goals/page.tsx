'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { PlusIcon, TrashIcon, FlagIcon, UserGroupIcon, ChartBarSquareIcon, CheckCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function OKRCenterPage() {
    const { data: okrs, error, mutate } = useSWR('/api/hr/goals', fetcher);
    const { data: employees } = useSWR('/api/hr/employees', fetcher);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        year: new Date().getFullYear(),
        quarter: 1,
        keyResults: [{ title: '', targetValue: 100, unit: '%', employeeId: '' }]
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initiative Delegation State
    const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false);
    const [selectedKR, setSelectedKR] = useState<any>(null);
    const [iniData, setIniData] = useState({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        expReward: 500,
        coinReward: 100,
        ownerId: ''
    });

    const handleAddKR = () => {
        setFormData({
            ...formData,
            keyResults: [...formData.keyResults, { title: '', targetValue: 100, unit: '%', employeeId: '' }]
        });
    };

    const handleRemoveKR = (index: number) => {
        const updated = [...formData.keyResults];
        updated.splice(index, 1);
        setFormData({ ...formData, keyResults: updated });
    };

    const handleKRChange = (index: number, field: string, value: any) => {
        const updated = [...formData.keyResults];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, keyResults: updated });
    };

    const handleEdit = (okr: any) => {
        setFormData({
            title: okr.title,
            description: okr.description || '',
            year: okr.year,
            quarter: okr.quarter || 1,
            keyResults: okr.keyResults && okr.keyResults.length > 0
                ? okr.keyResults.map((kr: any) => ({
                    id: kr.id,
                    title: kr.title,
                    targetValue: kr.targetValue,
                    unit: kr.unit,
                    employeeId: kr.employeeId || ''
                }))
                : [{ title: '', targetValue: 100, unit: '%', employeeId: '' }]
        });
        setEditingId(okr.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Objective? All its Key Results will be removed.')) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/hr/goals/objectives/${id}`, { method: 'DELETE' });
            if (res.ok) mutate();
            else alert('Failed to delete OKR.');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const url = editingId ? `/api/hr/goals/objectives/${editingId}` : '/api/hr/goals';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setFormData({ title: '', description: '', year: new Date().getFullYear(), quarter: 1, keyResults: [{ title: '', targetValue: 100, unit: '%', employeeId: '' }] });
                mutate();
            } else {
                alert('Failed to save OKR. Make sure you are an OWNER or MANAGER.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const onInitiativeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (!iniData.ownerId) {
            alert('Please select an Owner to delegate this Action Plan to.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/hr/initiatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...iniData, keyResultId: selectedKR.id }),
            });

            if (res.ok) {
                setIsInitiativeModalOpen(false);
                setIniData({
                    title: '', description: '',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    expReward: 500, coinReward: 100, ownerId: ''
                });
                alert('Initiative successfully delegated!');
            } else {
                const err = await res.json();
                alert(`Failed to delegate: ${err.error}`);
            }
        } catch (error) {
            alert('An error occurred during delegation.');
        } finally {
            setIsLoading(false);
        }
    };

    if (error) return <div className="p-6 text-red-500">Failed to load OKRs.</div>;
    if (!okrs) return <div className="p-6">Loading OKR Center...</div>;
    if (okrs.error) return <div className="p-6 text-red-500 font-bold border-2 border-red-200 bg-red-50 rounded-xl m-6">Access Error: {okrs.error}</div>;
    if (!Array.isArray(okrs)) return <div className="p-6 text-red-500">Data alignment error.</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <ChartBarSquareIcon className="w-10 h-10 text-blue-600" />
                        OKR Alignment Center
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Drive company performance through top-down Objective & Key Results mapping.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ title: '', description: '', year: new Date().getFullYear(), quarter: 1, keyResults: [{ title: '', targetValue: 100, unit: '%', employeeId: '' }] });
                        setIsModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition font-bold shadow-lg shadow-blue-600/30"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Objective
                </button>
            </div>

            <div className="space-y-6">
                {okrs.map((okr: any) => (
                    <div key={okr.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100 relative">
                            {/* Hover Actions */}
                            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(okr)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition">
                                    <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(okr.id)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 transition">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-between items-start mb-2 pr-20">
                                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                    {okr.year} Q{okr.quarter}
                                </span>
                                <span className="text-sm font-bold text-gray-500 flex items-center gap-1">
                                    <UserGroupIcon className="w-4 h-4" /> {okr.keyResults.filter((kr: any) => kr.employeeId).length} Assignees
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-1">{okr.title}</h2>
                            {okr.description && <p className="text-sm text-gray-600 font-medium">{okr.description}</p>}
                        </div>

                        <div className="p-6 bg-white">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
                                <CheckCircleIcon className="w-5 h-5 text-gray-400" /> Key Results
                            </h3>

                            {okr.keyResults && okr.keyResults.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {okr.keyResults.map((kr: any) => {
                                        const progress = Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
                                        return (
                                            <div key={kr.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between hover:border-blue-300 transition group">
                                                <div className="mb-4">
                                                    <h4 className="font-bold text-gray-800 text-sm leading-snug group-hover:text-blue-600 transition">{kr.title}</h4>
                                                </div>

                                                <div>
                                                    <div className="flex items-end justify-between mb-1">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Progress</span>
                                                        <span className="font-bold text-sm text-gray-900">{kr.currentValue} / {kr.targetValue} <span className="text-gray-500 text-xs">{kr.unit}</span></span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                                                        <div className={`h-2 rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-3">
                                                        <div className="flex items-center gap-2">
                                                            {kr.employee ? (
                                                                <>
                                                                    {kr.employee.user?.image ? (
                                                                        <Image src={kr.employee.user.image} alt="Avatar" width={20} height={20} className="rounded-full blur-none" />
                                                                    ) : (
                                                                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[8px]">
                                                                            {kr.employee.user?.name?.charAt(0) || 'E'}
                                                                        </div>
                                                                    )}
                                                                    <span className="text-xs font-bold text-gray-700 line-clamp-1">{kr.employee.user?.name}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">Unassigned</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => { setSelectedKR(kr); setIsInitiativeModalOpen(true); }}
                                                            className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm hover:shadow-md"
                                                        >
                                                            Delegate Action Plan
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center text-sm font-medium text-gray-400 bg-gray-50">
                                    No Key Results mapped to this objective yet.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {okrs.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <ChartBarSquareIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-700">No OKRs Established</h3>
                        <p className="text-gray-500 font-medium">Align your organization by defining Quarterly Objectives.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
                            <h2 className="text-xl font-bold flex items-center gap-2"><FlagIcon className="w-6 h-6" /> {editingId ? 'Edit Strategic Objective' : 'Strategic Objective'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white/20 p-1 rounded transition">✕</button>
                        </div>

                        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid md:grid-cols-4 gap-4">
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Objective Title *</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 text-lg font-bold focus:border-blue-500 outline-none transition" placeholder="e.g. Dominate South-East Asia Market Share" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Timeframe</label>
                                    <div className="flex gap-2">
                                        <select value={formData.year} onChange={e => setFormData({ ...formData, year: Number(e.target.value) })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-700 outline-none">
                                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                        <select value={formData.quarter} onChange={e => setFormData({ ...formData, quarter: Number(e.target.value) })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-700 outline-none">
                                            {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium" rows={2} placeholder="Clarify the vision behind this objective..." />
                            </div>

                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                <div className="flex justify-between items-center mb-4 border-b border-blue-200 pb-2">
                                    <label className="block text-lg font-black text-blue-900">Key Results (KRs)</label>
                                    <button type="button" onClick={handleAddKR} className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                                        <PlusIcon className="w-4 h-4" /> Add KR
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.keyResults.map((kr, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-blue-100 shadow-sm relative group">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">KR Metric *</label>
                                                <input required type="text" value={kr.title} onChange={e => handleKRChange(index, 'title', e.target.value)} className="w-full border-b-2 border-gray-200 focus:border-blue-500 p-1 font-bold outline-none text-sm placeholder-gray-300" placeholder="e.g. Launch 3 new regional marketing campaigns" />
                                            </div>

                                            <div className="w-full md:w-28">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target *</label>
                                                <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500">
                                                    <input required type="number" value={kr.targetValue} onChange={e => handleKRChange(index, 'targetValue', Number(e.target.value))} className="w-full p-2 font-bold outline-none text-sm text-center bg-transparent" />
                                                    <input type="text" value={kr.unit} onChange={e => handleKRChange(index, 'unit', e.target.value)} className="w-10 bg-gray-100 p-2 font-bold text-gray-500 text-center text-xs outline-none border-l border-gray-200" placeholder="%" />
                                                </div>
                                            </div>

                                            <div className="w-full md:w-48 flex items-end">
                                                <div className="w-full">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Delegate To</label>
                                                    <select value={kr.employeeId} onChange={e => handleKRChange(index, 'employeeId', e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white font-medium outline-none text-gray-600 focus:border-blue-500">
                                                        <option value="">-- Optional --</option>
                                                        {employees?.map((emp: any) => (
                                                            <option key={emp.id} value={emp.id}>{emp.user?.name || emp.user?.email}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {formData.keyResults.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveKR(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-500 hover:text-white transition shadow-sm opacity-0 group-hover:opacity-100">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 shrink-0 border-t border-gray-100 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 hover:bg-gray-100 text-sm rounded-xl transition font-bold">Cancel</button>
                                <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/30 text-white px-8 py-2.5 text-sm rounded-xl transition font-bold disabled:opacity-50 flex items-center gap-2">
                                    {isLoading ? 'Deploying...' : (editingId ? 'Update OKRs' : 'Deploy OKRs')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Initiative Delegation Modal */}
            {isInitiativeModalOpen && selectedKR && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-orange-500/20">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h2 className="text-xl font-black flex items-center gap-2 tracking-wide uppercase">Delegate Action Plan</h2>
                                <p className="text-orange-100 text-sm font-medium mt-1">Linking to KR: {selectedKR.title}</p>
                            </div>
                            <button onClick={() => setIsInitiativeModalOpen(false)} className="text-white hover:bg-white/20 p-2 rounded-full transition">✕</button>
                        </div>

                        <form onSubmit={onInitiativeSubmit} className="p-8 space-y-6 bg-gray-50/50">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Initiative Title *</label>
                                    <input required type="text" value={iniData.title} onChange={e => setIniData({ ...iniData, title: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-orange-500 outline-none transition shadow-sm" placeholder="e.g. Execute SEA Viral Ad Campaign" />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Start Date *</label>
                                    <input required type="date" value={iniData.startDate} onChange={e => setIniData({ ...iniData, startDate: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-700 outline-none focus:border-orange-500 shadow-sm" />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">End Date (Deadline) *</label>
                                    <input required type="date" value={iniData.endDate} onChange={e => setIniData({ ...iniData, endDate: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-700 outline-none focus:border-orange-500 shadow-sm" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Strategic Description</label>
                                    <textarea value={iniData.description} onChange={e => setIniData({ ...iniData, description: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none font-medium shadow-sm transition" rows={2} placeholder="Clarify the execution strategy for the Single-Threaded Owner..." />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-xs font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1">Boss Fight EXP Reward</label>
                                    <input required type="number" min="0" value={iniData.expReward} onChange={e => setIniData({ ...iniData, expReward: Number(e.target.value) })} className="w-full border-2 border-orange-100 bg-orange-50 text-orange-700 rounded-xl p-3 font-black outline-none focus:border-orange-500 shadow-sm" />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-xs font-black text-yellow-500 uppercase tracking-widest mb-2 flex items-center gap-1">Coin Payout</label>
                                    <input required type="number" min="0" value={iniData.coinReward} onChange={e => setIniData({ ...iniData, coinReward: Number(e.target.value) })} className="w-full border-2 border-yellow-100 bg-yellow-50 text-yellow-700 rounded-xl p-3 font-black outline-none focus:border-yellow-500 shadow-sm" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-blue-500 uppercase tracking-widest mb-2 bg-blue-50 w-max px-2 py-1 rounded-md border border-blue-100">Delegated Owner (Single-Threaded Leader) *</label>
                                    <select required value={iniData.ownerId} onChange={e => setIniData({ ...iniData, ownerId: e.target.value })} className="w-full p-3 border-2 border-blue-200 shadow-sm rounded-xl text-sm bg-white font-bold outline-none text-blue-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition">
                                        <option value="" disabled>-- Select an Employee to Own this Action Plan --</option>
                                        {employees?.map((emp: any) => (
                                            <option key={emp.id} value={emp.id}>{emp.user?.name || emp.user?.email}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 shrink-0 border-t border-gray-200 mt-6">
                                <button type="button" onClick={() => setIsInitiativeModalOpen(false)} className="px-6 py-3 text-gray-500 hover:bg-gray-200 text-sm rounded-xl transition font-bold">Cancel</button>
                                <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 hover:scale-105 shadow-xl shadow-red-500/30 text-white px-8 py-3 text-sm rounded-xl transition-all font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
                                    {isLoading ? 'Transmitting Orders...' : 'Delegate Now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
