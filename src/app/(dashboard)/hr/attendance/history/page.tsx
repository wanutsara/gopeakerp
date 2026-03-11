'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
    ClockIcon, CalendarDaysIcon, FunnelIcon, MagnifyingGlassIcon,
    ExclamationTriangleIcon, ShieldCheckIcon, PencilSquareIcon, CheckCircleIcon, XCircleIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HistoricalTimesheetsPage() {
    // Determine default date range: Last 7 days
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    
    // Fetch Data
    const { data, error, isLoading, mutate } = useSWR(`/api/hr/attendance/history?startDate=${startDate}&endDate=${endDate}`, fetcher);
    
    // UI Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');

    // Override Modal State
    const [editingLog, setEditingLog] = useState<any>(null);
    const [overrideIn, setOverrideIn] = useState('');
    const [overrideOut, setOverrideOut] = useState('');
    const [overrideStatus, setOverrideStatus] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Audit Log Modal State
    const [viewingAudits, setViewingAudits] = useState<any[] | null>(null);

    const timesheets = data?.timesheets || [];

    // Derive list of departments for filter dropdown
    const departments = Array.from(new Set(timesheets.map((t: any) => t.employee?.department?.name).filter(Boolean))) as string[];

    const filteredTimesheets = timesheets.filter((t: any) => {
        if (deptFilter !== 'ALL' && t.employee?.department?.name !== deptFilter) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const name = t.employee?.user?.name || t.employee?.user?.email || '';
            if (!name.toLowerCase().includes(query)) return false;
        }
        return true;
    });

    const openEditModal = (log: any) => {
        setEditingLog(log);
        
        // Extract HH:mm for input fields
        const inTime = log.payableCheckInTime || log.checkInTime;
        const outTime = log.payableCheckOutTime || log.checkOutTime;
        
        // Format to local HH:mm string for input type="time"
        const formatTime = (isoString: string) => {
            if (!isoString) return '';
            const d = new Date(isoString);
            return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        };

        setOverrideIn(formatTime(inTime));
        setOverrideOut(formatTime(outTime));
        setOverrideStatus(log.status || 'ABSENT');
        setOverrideReason('');
    };

    const handleOverrideSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (overrideReason.trim().length < 5) {
            alert("⚠️ กรุณาระบุเหตุผลในการแก้ไข (Audit Reason) อย่างน้อย 5 ตัวอักษร");
            return;
        }

        setIsSubmitting(true);

        try {
            // Reconstruct full DateTime for the payload
            const baseDate = new Date(editingLog.date); // UTC Date
            
            const constructDateTime = (timeString: string) => {
                if (!timeString) return null;
                const [hh, mm] = timeString.split(':').map(Number);
                const d = new Date(baseDate);
                d.setHours(hh, mm, 0, 0); // Note: This uses local timezone mapping which is standard for input
                return d.toISOString();
            };

            const payload = {
                timeLogId: editingLog.id,
                employeeId: editingLog.employeeId,
                targetDate: editingLog.date,
                payableCheckInTime: constructDateTime(overrideIn),
                payableCheckOutTime: constructDateTime(overrideOut),
                statusOverride: overrideStatus,
                reason: overrideReason
            };

            const res = await fetch('/api/hr/attendance/history/override', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to apply override');
            }

            setEditingLog(null);
            mutate(); // Refresh the grid
            alert("✅ บันทึกการแก้ไข (Audit Trail) สำเร็จแล้ว");

        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ON_TIME': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'LATE': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'ABSENT': case 'NO_SHOW': return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'HOLIDAY': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'ON_LEAVE': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="p-8 max-w-screen-2xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                        <ClockIcon className="w-8 h-8 text-indigo-600" />
                        Historical Timesheets
                    </h1>
                    <p className="mt-2 text-gray-500 font-medium">
                        World-Class Historical Log Engine. Review exact check-ins, detect missing shifts, and enforce <span className="text-indigo-600 font-bold">Immutable Audit overrides.</span>
                    </p>
                </div>
                
                {/* Global Date Controls */}
                <div className="flex items-center gap-3 bg-white p-2 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 pl-3">
                        <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</span>
                    </div>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-none bg-gray-50 rounded-lg text-sm px-3 py-2 font-medium focus:ring-0 cursor-pointer" />
                    <span className="text-gray-400 font-bold">-</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-none bg-gray-50 rounded-lg text-sm px-3 py-2 font-medium focus:ring-0 cursor-pointer" />
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="Search employee by name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    />
                </div>
                <div className="sm:w-64 relative">
                    <FunnelIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <select 
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer appearance-none"
                    >
                        <option value="ALL">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Data Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-700">Logical Date</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Employee</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-center">Actual Scan Time</th>
                                <th className="px-6 py-4 font-bold text-indigo-700 text-center bg-indigo-50/50">Payable Time (For Payroll)</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium animate-pulse">Running Historical Query...</td></tr>
                            ) : filteredTimesheets.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">No records found for this period.</td></tr>
                            ) : (
                                filteredTimesheets.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || (a.employee?.user?.name || "").localeCompare(b.employee?.user?.name || "")).map((log: any) => {
                                    
                                    const formatTime = (isoField: string) => {
                                        if (!isoField) return "--:--";
                                        return new Date(isoField).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                                    };

                                    const isMissing = log.isGhost;
                                    const employeeName = log.employee?.user?.name || log.employee?.user?.email || 'Unknown';
                                    const deptName = log.employee?.department?.name || 'No Dept';

                                    return (
                                        <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${isMissing ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{employeeName}</div>
                                                <div className="text-xs text-gray-500">{deptName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getStatusStyle(log.status)} flex items-center w-fit gap-1.5`}>
                                                    {isMissing && log.status === 'NO_SHOW' && <ExclamationTriangleIcon className="w-3.5 h-3.5" />}
                                                    {log.status.replace('_', ' ')}
                                                </span>
                                                {log.ghostReason && (
                                                    <div className="text-[10px] text-gray-500 mt-1.5 font-bold tracking-tight bg-gray-50 border border-gray-100 px-2 py-0.5 rounded w-fit">
                                                        {log.ghostReason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-mono bg-gray-50 px-3 py-1.5 rounded-lg w-fit mx-auto border border-gray-100">
                                                    <span>{formatTime(log.checkInTime)}</span>
                                                    <span className="text-gray-300">→</span>
                                                    <span>{formatTime(log.checkOutTime)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 bg-indigo-50/20">
                                                <div className="flex items-center justify-center gap-2 font-mono px-3 py-1.5 rounded-lg w-fit mx-auto border font-bold text-indigo-900 border-indigo-100 bg-white shadow-sm">
                                                    <span>{formatTime(log.payableCheckInTime ?? log.checkInTime)}</span>
                                                    <span className="text-indigo-200">→</span>
                                                    <span>{formatTime(log.payableCheckOutTime ?? log.checkOutTime)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {log.isOverridden && log.auditLogs && log.auditLogs.length > 0 && (
                                                        <button 
                                                            onClick={() => setViewingAudits(log.auditLogs)}
                                                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                                                            title="View Audit Trail"
                                                        >
                                                            <ShieldCheckIcon className="w-4 h-4" />
                                                            Audit ({log.auditLogs.length})
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => openEditModal(log)}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                        Override
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Override Modal */}
            {editingLog && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-indigo-600 px-6 py-5 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ShieldCheckIcon className="w-6 h-6 text-indigo-200" />
                                    HR Authority Override
                                </h2>
                                <p className="text-indigo-200 text-xs mt-1 font-medium">Modifying Payable Time for: {editingLog.employee?.user?.name}</p>
                            </div>
                            <button onClick={() => setEditingLog(null)} className="text-indigo-300 hover:text-white p-1 transition-colors"><XCircleIcon className="w-8 h-8" /></button>
                        </div>
                        
                        <form onSubmit={handleOverrideSubmit} className="p-8 space-y-6">
                            
                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Payable Check-In</label>
                                    <input type="time" required={!!overrideOut} value={overrideIn} onChange={(e) => setOverrideIn(e.target.value)} className="w-full font-mono text-lg px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Payable Check-Out</label>
                                    <input type="time" required={!!overrideIn} value={overrideOut} onChange={(e) => setOverrideOut(e.target.value)} className="w-full font-mono text-lg px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Override Status</label>
                                <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-medium">
                                    <option value="ON_TIME">✅ ON TIME (ตรงเวลา)</option>
                                    <option value="LATE">⚠️ LATE (สาย)</option>
                                    <option value="ABSENT">❌ ABSENT (ขาดงาน)</option>
                                    <option value="HALF_DAY">🌗 HALF DAY (ครึ่งวัน)</option>
                                    <option value="SICK_LEAVE">🤒 SICK LEAVE (ลาป่วย)</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <label className="flex items-center gap-2 text-sm font-bold text-rose-600">
                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                    Mandatory Immutable Audit Reason
                                </label>
                                <p className="text-xs text-gray-500 font-medium">This reason becomes a permanent legal record attached to the timesheet. It cannot be deleted.</p>
                                <textarea 
                                    required 
                                    minLength={5}
                                    rows={3} 
                                    placeholder="E.g. Approved overtime by Manager A, or Fingerprint scanner malfunctioned..."
                                    value={overrideReason} 
                                    onChange={(e) => setOverrideReason(e.target.value)} 
                                    className="w-full px-4 py-3 bg-rose-50/50 border border-rose-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 font-medium resize-none shadow-inner" 
                                />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {isSubmitting ? 'Securing Audit Trail...' : 'Confirm Authority Override'}
                                <CheckCircleIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Audits Modal */}
            {viewingAudits && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
                        <div className="bg-emerald-600 px-6 py-5 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <DocumentTextIcon className="w-6 h-6 text-emerald-200" />
                                Immutable Overrides Log
                            </h2>
                            <button onClick={() => setViewingAudits(null)} className="text-emerald-300 hover:text-white p-1 transition-colors"><XCircleIcon className="w-8 h-8" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-slate-50">
                            {viewingAudits.map(audit => (
                                <div key={audit.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative pl-12">
                                    <div className="absolute left-6 top-6 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
                                    <div className="absolute left-[27px] top-10 bottom-[-16px] w-[2px] bg-emerald-100 last:hidden"></div>
                                    
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                                            {new Date(audit.createdAt).toLocaleString()}
                                        </span>
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                            HR ID: {audit.changedBy.substring(0,8)}...
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 leading-relaxed mb-3">"{audit.reason}"</p>
                                    
                                    <div className="flex items-center gap-4 text-xs font-mono bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="flex-1 opacity-60 line-through text-gray-500">
                                            IN: {audit.oldCheckIn ? new Date(audit.oldCheckIn).toLocaleTimeString() : 'null'} <br/>
                                            OUT: {audit.oldCheckOut ? new Date(audit.oldCheckOut).toLocaleTimeString() : 'null'}
                                        </div>
                                        <div className="text-emerald-500 font-bold">➔</div>
                                        <div className="flex-1 font-bold text-indigo-700">
                                            IN: {audit.newCheckIn ? new Date(audit.newCheckIn).toLocaleTimeString() : 'null'} <br/>
                                            OUT: {audit.newCheckOut ? new Date(audit.newCheckOut).toLocaleTimeString() : 'null'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
