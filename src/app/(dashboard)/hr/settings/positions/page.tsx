'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { PlusIcon, TrashIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function JobPositionsPage() {
    const { data: positions, error, mutate } = useSWR('/api/hr/positions', fetcher);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        minSalary: 0,
        maxSalary: 0,
        competencies: [{ name: '', requiredLevel: 1 }]
    });

    const [isLoading, setIsLoading] = useState(false);

    const handleAddCompetency = () => {
        setFormData({
            ...formData,
            competencies: [...formData.competencies, { name: '', requiredLevel: 1 }]
        });
    };

    const handleRemoveCompetency = (index: number) => {
        const updated = [...formData.competencies];
        updated.splice(index, 1);
        setFormData({ ...formData, competencies: updated });
    };

    const handleCompetencyChange = (index: number, field: string, value: any) => {
        const updated = [...formData.competencies];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, competencies: updated });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/hr/positions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    // Filter out empty competencies
                    competencies: formData.competencies.filter(c => c.name.trim() !== '')
                }),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ title: '', description: '', minSalary: 0, maxSalary: 0, competencies: [{ name: '', requiredLevel: 1 }] });
                mutate();
            } else {
                alert('Failed to save Job Position. Make sure you are an OWNER.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (error) return <div className="p-6 text-red-500">Failed to load Job Positions.</div>;
    if (!positions) return <div className="p-6 animate-pulse">Loading Position Matrix...</div>;
    if (positions.error) return <div className="p-6 text-red-500 font-bold border-2 border-red-200 bg-red-50 rounded-xl m-6">Access Error: {positions.error}</div>;
    if (!Array.isArray(positions)) return <div className="p-6 text-red-500 font-bold">Data alignment error. Administrator privileges required.</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BriefcaseIcon className="w-8 h-8 text-indigo-600" />
                        Core HR: Job Positions
                    </h1>
                    <p className="text-gray-500 mt-1">Manage standard job titles, salary bands, and competency requirements.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Job Position
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions.map((pos: any) => (
                    <div key={pos.id} className="bg-white rounded-xl shadow border border-gray-100 p-5 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-gray-800">{pos.title}</h3>
                            <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
                                {pos._count.employees} Users
                            </span>
                        </div>

                        {pos.description && <p className="text-sm text-gray-500 mb-4">{pos.description}</p>}

                        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                            <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">Salary Band (THB)</span>
                            <div className="font-medium text-gray-800">
                                ฿{pos.minSalary.toLocaleString()} - ฿{pos.maxSalary.toLocaleString()}
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-gray-500 uppercase font-semibold block mb-2">Required Skills (Competencies)</span>
                            {pos.competencies && pos.competencies.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {pos.competencies.map((compReq: any) => (
                                        <span key={compReq.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md border border-blue-100">
                                            {compReq.competency.name}
                                            <span className="bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full leading-none">
                                                Lv.{compReq.requiredLevel}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400 italic">No specific skills required.</span>
                            )}
                        </div>
                    </div>
                ))}
                {positions.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                        No Job Positions defined yet. Establish the Core HR foundation by creating one.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Create Job Position</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Senior Frontend Engineer" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} placeholder="Role responsibilities..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary Band (฿)</label>
                                        <input type="number" value={formData.minSalary} onChange={e => setFormData({ ...formData, minSalary: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary Band (฿)</label>
                                        <input type="number" value={formData.maxSalary} onChange={e => setFormData({ ...formData, maxSalary: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none" />
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="block text-sm font-bold text-gray-900">Required Competencies (Skills)</label>
                                        <button type="button" onClick={handleAddCompetency} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                            <PlusIcon className="w-4 h-4" /> Add Skill
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.competencies.map((comp, index) => (
                                            <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <div className="flex-1">
                                                    <input type="text" value={comp.name} onChange={e => handleCompetencyChange(index, 'name', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="Skill Name (e.g. React.js, Leadership)" />
                                                </div>
                                                <div className="w-32">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 font-medium">Lvl</span>
                                                        <select value={comp.requiredLevel} onChange={e => handleCompetencyChange(index, 'requiredLevel', Number(e.target.value))} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                                                            {[1, 2, 3, 4, 5].map(lvl => (
                                                                <option key={lvl} value={lvl}>{lvl}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                {formData.competencies.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveCompetency(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-md transition">
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition font-medium">Cancel</button>
                                <button disabled={isLoading} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition font-medium flex items-center gap-2 disabled:opacity-50">
                                    {isLoading ? 'Saving...' : 'Save Job Position'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
