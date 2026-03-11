'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { CalendarDaysIcon, PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CompanyHolidaysPage() {
    const { data, error, isLoading, mutate } = useSWR('/api/hr/settings/holidays', fetcher);
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [isPaid, setIsPaid] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const holidays = data?.holidays || [];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !date) return;
        
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/hr/settings/holidays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, date, isPaid })
            });
            if (res.ok) {
                setName('');
                setDate('');
                mutate();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create holiday');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            const res = await fetch(`/api/hr/settings/holidays?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                mutate();
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                    <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
                    Company Holidays
                </h1>
                <p className="mt-2 text-gray-500 font-medium max-w-2xl">
                    Declare public holidays for the entire company. These dates will automatically interlock with the Timesheet Matrix, excusing absences and marking the day as <span className="font-bold text-blue-600">HOLIDAY</span>.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Creation Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleCreate} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-5 sticky top-8">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <PlusIcon className="w-5 h-5 text-blue-500" />
                                Add New Holiday
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">Schedules are globally synced.</p>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Holiday Name</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="e.g. Songkran Festival"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Date</label>
                            <input 
                                type="date" 
                                required 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 uppercase"
                            />
                        </div>

                        <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={isPaid}
                                onChange={(e) => setIsPaid(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <div className="text-sm font-bold text-gray-900">Paid Holiday</div>
                                <div className="text-xs text-gray-500 font-medium">Employees receive full daily wage</div>
                            </div>
                        </label>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-2 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Registering...' : 'Declare Holiday'}
                        </button>
                    </form>
                </div>

                {/* Data List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center p-12 text-gray-400 font-medium animate-pulse">Syncing Calendar data...</div>
                        ) : holidays.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                <CalendarDaysIcon className="w-16 h-16 mb-4 opacity-20" />
                                <div className="font-bold text-gray-600 text-lg">No Holidays Declared</div>
                                <div className="text-sm mt-1 max-w-xs">Your timesheet matrix will strictly expect attendance 365 days a year.</div>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {holidays.map((h: any) => (
                                    <li key={h.id} className="p-5 sm:p-6 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-blue-700 shrink-0">
                                                <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                                                    {new Date(h.date).toLocaleDateString('en-GB', { month: 'short' })}
                                                </span>
                                                <span className="text-xl font-black leading-none">
                                                    {new Date(h.date).getDate()}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{h.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                                                        {h.isPaid ? 'PAID HOLIDAY' : 'UNPAID'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-medium">Affects all branches</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(h.id)}
                                            className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Revoke Holiday"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
