'use client';
import { useState, useEffect } from 'react';
import { SparklesIcon, Cog6ToothIcon, CheckCircleIcon, CurrencyDollarIcon, BanknotesIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function SystemSettingsPage() {
    const [financeGoLiveDate, setFinanceGoLiveDate] = useState<string>('');
    const [defaultLogicalCutoff, setDefaultLogicalCutoff] = useState<string>('04:00');
    const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(15);
    const [strictOutboundCutoff, setStrictOutboundCutoff] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings/system');
                if (res.ok) {
                    const data = await res.json();
                    if (data.financeGoLiveDate) {
                        setFinanceGoLiveDate(data.financeGoLiveDate.split('T')[0]);
                    }
                    if (data.defaultLogicalCutoff) {
                        setDefaultLogicalCutoff(data.defaultLogicalCutoff);
                    }
                    if (data.gracePeriodMinutes !== undefined) {
                        setGracePeriodMinutes(data.gracePeriodMinutes);
                    }
                    if (data.strictOutboundCutoff !== undefined) {
                        setStrictOutboundCutoff(data.strictOutboundCutoff);
                    }
                }
            } catch (error) {
                console.error('Failed to load system settings', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            const res = await fetch('/api/settings/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    financeGoLiveDate: financeGoLiveDate || null,
                    defaultLogicalCutoff: defaultLogicalCutoff,
                    gracePeriodMinutes: gracePeriodMinutes,
                    strictOutboundCutoff: strictOutboundCutoff
                })
            });
            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Failed to save settings', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-gray-500 font-medium animate-pulse">Loading Global Configurations...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8 w-full">
            <div>
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                    <Cog6ToothIcon className="w-8 h-8 text-gray-700" />
                    Global System Configuration
                </h1>
                <p className="mt-2 text-gray-500 font-medium">
                    Configure master settings that affect how modules interact within GOPEAK ERP.
                </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6">
                <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                        <BanknotesIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">Accounting Cut-off Rule (Go-Live Date)</h2>
                        <p className="text-gray-500 text-sm mt-1 max-w-2xl leading-relaxed">
                            Define the system-wide historical boundary for the Financial Ledger. Data imported into the ERP (e.g., Omni-Importer sales) with a date <span className="font-bold underline decoration-fuchsia-300">before</span> this selected date will bypass Cash Flow tracking. It will solely be used to enrich Customer Data Platform (CDP / RFM) marketing profiles.
                        </p>

                        <div className="mt-6 flex flex-col gap-2 max-w-xs">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                Finance Go-Live Date
                            </label>
                            <input
                                type="date"
                                value={financeGoLiveDate}
                                onChange={(e) => setFinanceGoLiveDate(e.target.value)}
                                className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm cursor-pointer"
                            />
                            {financeGoLiveDate && (
                                <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1.5">
                                    <SparklesIcon className="w-4 h-4" />
                                    Cash Flow Tracking starts purely from {new Date(financeGoLiveDate).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ClockIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">Logical Day Cutoff (เวลาตัดยอดวัน)</h2>
                        <p className="text-gray-500 text-sm mt-1 max-w-2xl leading-relaxed">
                            Define the system-wide default hour when the business day officially rolls over into "Tomorrow". Essential for reconciling overnight shifts (e.g. 23:00 - 06:00). Standard corporate is <span className="font-bold">04:00 AM</span>.
                        </p>

                        <div className="mt-6 flex flex-col gap-2 max-w-xs">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                Company Global Shift Cutoff
                            </label>
                            <input
                                type="time"
                                value={defaultLogicalCutoff}
                                onChange={(e) => setDefaultLogicalCutoff(e.target.value)}
                                className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm cursor-pointer"
                            />
                            {defaultLogicalCutoff && (
                                <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1.5">
                                    <SparklesIcon className="w-4 h-4" />
                                    The entire ERP shifts days at {defaultLogicalCutoff}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ClockIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">Auto-Rounding & Grace Period AI</h2>
                        <p className="text-gray-500 text-sm mt-1 max-w-2xl leading-relaxed">
                            Configure how the Check-In Engine calculates <span className="font-bold underline">Payable Time</span>. The Grace Period forgives minor lateness, while the Strict Cutoff prevents unaccounted Overtime bleeding by snapping late check-outs back to the exact shift end (e.g. 18:00).
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-6">
                            <div className="flex flex-col gap-2 max-w-xs flex-1">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                    Grace Period (Minutes)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={gracePeriodMinutes}
                                    onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                                    className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-sm"
                                />
                                <p className="text-xs text-rose-600 font-medium mt-1">Arrivals within {gracePeriodMinutes} mins are snapped to exact shift start.</p>
                            </div>
                            <div className="flex flex-col gap-2 max-w-xs flex-1 justify-center pt-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={strictOutboundCutoff}
                                        onChange={(e) => setStrictOutboundCutoff(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-bold text-gray-900">Enable Strict Check-Out Cutoff</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    {saveSuccess ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 animate-fade-in-up">
                            <CheckCircleIcon className="w-5 h-5" />
                            Global Configuration Saved
                        </div>
                    ) : (
                        <div />
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95 flex items-center gap-3 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {isSaving ? 'Saving...' : 'Save Global Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
