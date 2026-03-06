"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { BellIcon, CheckCircleIcon, InformationCircleIcon, ClockIcon, MegaphoneIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Noticenter() {
    const { data, mutate } = useSWR('/api/notifications', fetcher, { refreshInterval: 30000 }); // Auto check every 30s
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const notifications = data?.notifications || [];
    const unreadCount = data?.unreadCount || 0;

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id?: string) => {
        await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'MARK_READ', id })
        });
        mutate();
    };

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }
        setIsOpen(false);
        const type = notification.type;
        const title = notification.title || "";

        // Enterprise Deep-Link Routing Matrix
        if (type === 'OVERTIME_REQUEST') {
            router.push('/hr/overtime');
        } else if (type === 'LEAVE_REQUEST') {
            router.push('/hr/leave');
        } else if (type === 'ATTENDANCE_REQUEST') {
            router.push('/hr/attendance');
        } else if (type === 'EXPENSE_REQUEST') {
            router.push('/finance/expenses');
        } else if (type === 'ANNOUNCEMENT') {
            router.push('/hr/announcements');
        } else if (type === 'GOAL_ASSIGNED') {
            router.push('/hr/goals');
        } else if (type === 'SYSTEM') {
            if (title.includes('เบิกจ่าย')) router.push('/finance/expenses');
            else if (title.includes('AI Extraction')) router.push(`/oms/import?jobId=${notification.referenceId}`);
            else router.push('/dashboard'); // Generic fallback
        } else {
            console.log("No routing match for type:", type);
            router.push('/dashboard');
        }
    };

    const getIcon = (type: string, title?: string) => {
        if (type === 'SYSTEM' && title?.includes('AI')) return <SparklesIcon className="w-5 h-5 text-fuchsia-500" />;
        switch (type) {
            case 'ATTENDANCE_REQUEST': return <ClockIcon className="w-5 h-5 text-blue-500" />;
            case 'OVERTIME_REQUEST': return <ClockIcon className="w-5 h-5 text-orange-500" />;
            case 'LEAVE_REQUEST': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'EXPENSE_REQUEST': return <InformationCircleIcon className="w-5 h-5 text-teal-500" />;
            case 'ANNOUNCEMENT': return <MegaphoneIcon className="w-5 h-5 text-purple-500" />;
            default: return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                title="การแจ้งเตือน"
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">การแจ้งเตือน</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => handleMarkAsRead()}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                อ่านทั้งหมด
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500 flex flex-col items-center">
                                <BellIcon className="w-8 h-8 text-gray-200 mb-2" />
                                ไม่มีแจ้งเตือนใหม่
                            </div>
                        ) : (
                            notifications.map((notif: any) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 items-start ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        {getIcon(notif.type, notif.title)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {notif.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: th })}
                                        </p>
                                    </div>
                                    {!notif.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
