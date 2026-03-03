"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PortalDashboard() {
    const { data, error, isLoading, mutate } = useSWR("/api/ess/me", fetcher);

    // Live Clock State
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    // GPS Status State
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [gpsError, setGpsError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Start clock on mount
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAttendance = async (action: "CHECK_IN" | "CHECK_OUT") => {
        setIsCheckingIn(true);
        setGpsError("");
        setSuccessMsg("");

        if (!navigator.geolocation) {
            setGpsError("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง (GPS)");
            setIsCheckingIn(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                // Alternatively, you can fake coords here for testing if the user wants. 
                // Currently taking real device coords.

                try {
                    const res = await fetch("/api/attendance/check-in", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action, lat, lng })
                    });

                    const result = await res.json();

                    if (!res.ok) {
                        setGpsError(result.error || "เกิดข้อผิดพลาดในการลงเวลา");
                    } else {
                        setSuccessMsg(`${result.message} (ความคลาดเคลื่อน ${result.distance}m)`);
                        mutate(); // Refresh status
                    }
                } catch (err: any) {
                    setGpsError(err.message || "Network Error");
                } finally {
                    setIsCheckingIn(false);
                }
            },
            (err) => {
                setGpsError("กรุณาอนุญาตให้เข้าถึงตำแหน่งที่ตั้ง (Location Access) เพื่อลงเวลา");
                setIsCheckingIn(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    if (isLoading) return <div className="text-center py-20 text-gray-400">กำลังโหลดข้อมูล...</div>;
    if (error || data?.error) return <div className="text-center py-20 text-red-500">ไม่สามารถโหลดข้อมูลผู้ใช้งานได้</div>;

    const { employee, todayLog } = data;

    const hasCheckedIn = !!todayLog?.checkInTime;
    const hasCheckedOut = !!todayLog?.checkOutTime;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* User Profile Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/60 text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-inner mb-4">
                    {employee.user.name?.charAt(0) || "U"}
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{employee.user.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{employee.position} &bull; {employee.department?.name || "ไม่มีสังกัด"}</p>
            </div>

            {/* Attendance Card */}
            <div className="bg-white rounded-3xl p-1 shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="bg-gradient-to-br from-slate-900 to-blue-900 px-6 py-8 text-center rounded-[1.4rem]">
                    <h3 className="text-blue-200 text-sm font-semibold tracking-widest uppercase mb-2">เวลาปัจจุบัน</h3>
                    <div className="text-5xl font-black text-white tracking-tight tabular-nums font-mono drop-shadow-md">
                        {currentTime ? currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : "--:--:--"}
                    </div>
                    <div className="text-blue-100/80 text-sm mt-2">
                        {currentTime ? currentTime.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "..."}
                    </div>

                    <div className="mt-8">
                        {hasCheckedOut ? (
                            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 text-white text-center">
                                <span className="block text-3xl mb-2">👋</span>
                                <h4 className="font-bold text-lg">เลิกงานแล้ว</h4>
                                <p className="text-white/70 text-sm mt-1">เจอกันใหม่พรุ่งนี้นะคะ!</p>
                            </div>
                        ) : !hasCheckedIn ? (
                            <button
                                onClick={() => handleAttendance("CHECK_IN")}
                                disabled={isCheckingIn}
                                className="w-full relative group"
                            >
                                <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-300"></div>
                                <div className="relative bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xl rounded-2xl py-5 shadow-inner transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isCheckingIn ? "กำลังตรวจสอบพิกัด..." : "👇 กดลงเวลาเข้างาน"}
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleAttendance("CHECK_OUT")}
                                disabled={isCheckingIn}
                                className="w-full relative group"
                            >
                                <div className="absolute inset-0 bg-rose-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-rose-500 hover:bg-rose-400 text-white font-bold text-xl rounded-2xl py-5 shadow-inner transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isCheckingIn ? "กำลังตรวจสอบพิกัด..." : "👋 กดลงเวลาเลิกงาน"}
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error & Success Messages */}
            {gpsError && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl text-sm font-medium flex items-start">
                    <span className="text-xl mr-2 leading-none">⚠️</span>
                    <span>{gpsError}</span>
                </div>
            )}

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-sm font-medium flex items-start">
                    <span className="text-xl mr-2 leading-none">✅</span>
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Today's Log Summary */}
            {hasCheckedIn && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center"><span className="text-blue-500 mr-2">📋</span> บันทึกเวลาวันนี้</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-2xl">
                            <span className="text-sm font-medium text-gray-600">เวลาเข้างาน</span>
                            <span className="font-bold text-gray-900 text-lg tabular-nums">
                                {new Date(todayLog.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                        </div>
                        {hasCheckedOut && (
                            <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-2xl">
                                <span className="text-sm font-medium text-gray-600">เวลาเลิกงาน</span>
                                <span className="font-bold text-gray-900 text-lg tabular-nums">
                                    {new Date(todayLog.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-2xl">
                            <span className="text-sm font-medium text-gray-600">สถานะ</span>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${todayLog.status === 'ON_TIME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {todayLog.status === 'ON_TIME' ? "มาตรงเวลา" : "มาสาย (LATE)"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
