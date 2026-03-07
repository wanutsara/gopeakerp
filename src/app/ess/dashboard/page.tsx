"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'An error occurred while fetching the data.');
    return data;
};

export default function PortalDashboard() {
    const { data, error, isLoading, mutate } = useSWR("/api/ess/me", fetcher);

    // Live Clock State
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    // GPS Status State
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [gpsError, setGpsError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Time Adjustment Modal State
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [requestForm, setRequestForm] = useState({
        date: new Date().toISOString().split('T')[0],
        requestedCheckIn: "",
        requestedCheckOut: "",
        reason: ""
    });

    // Password Change Modal State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [passwordError, setPasswordError] = useState("");

    const { data: newsData, mutate: mutateNews } = useSWR("/api/ess/announcements", fetcher);
    const announcements = newsData?.announcements || [];
    const [isInteracting, setIsInteracting] = useState<string | null>(null);

    const handleAnnouncementInteract = async (annId: string, action: string) => {
        setIsInteracting(annId);
        try {
            await fetch(`/api/ess/announcements/${annId}/interact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });
            mutateNews();
        } catch (error) {
            console.error(error);
        } finally {
            setIsInteracting(null);
        }
    };

    // Mood State
    const { data: moodData, mutate: mutateMood } = useSWR("/api/ess/mood", fetcher);
    const [isSubmittingMood, setIsSubmittingMood] = useState(false);

    // Kudos State
    const { data: kudosFeed, mutate: mutateKudos } = useSWR("/api/ess/kudos", fetcher);
    const { data: colleaguesData } = useSWR("/api/ess/colleagues", fetcher);
    const [isKudosModalOpen, setIsKudosModalOpen] = useState(false);
    const [isSubmittingKudos, setIsSubmittingKudos] = useState(false);
    const [kudosForm, setKudosForm] = useState({ receiverId: "", badgeType: "THANK_YOU", message: "" });

    // Celebration State
    const [celebrationMsg, setCelebrationMsg] = useState("");

    // Goals State
    const { data: goalsData, mutate: mutateGoals } = useSWR("/api/ess/goals", fetcher);
    const [isUpdatingGoal, setIsUpdatingGoal] = useState<string | null>(null);

    // Leave Management State
    const { data: leaveData, mutate: mutateLeave } = useSWR("/api/ess/leave", fetcher);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        type: "SICK",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "18:00",
        requestedHours: 8,
        reason: ""
    });

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingLeave(true);
        try {
            const res = await fetch("/api/ess/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leaveForm)
            });
            if (!res.ok) throw new Error(await res.text());
            mutateLeave();
            setIsLeaveModalOpen(false);
            setSuccessMsg("ส่งคำขอลางานสำเร็จ! 🎉");
            setTimeout(() => setSuccessMsg(""), 3000);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (error) {
            console.error(error);
            setGpsError("แครช เซิร์ฟเวอร์ขัดข้อง");
            setTimeout(() => setGpsError(""), 3000);
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    // Overtime Management State
    const { data: otData, mutate: mutateOT } = useSWR("/api/ess/overtime", fetcher);
    const [isOTModalOpen, setIsOTModalOpen] = useState(false);
    const [isSubmittingOT, setIsSubmittingOT] = useState(false);
    const [otForm, setOTForm] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: "18:00",
        endTime: "20:00",
        calculatedHours: 2,
        multiplier: "1.5",
        reason: ""
    });

    const handleOTSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingOT(true);
        try {
            const res = await fetch("/api/ess/overtime", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(otForm)
            });
            if (!res.ok) throw new Error(await res.text());
            mutateOT();
            setIsOTModalOpen(false);
            setSuccessMsg("ส่งคำขอทำล่วงเวลา (OT) สำเร็จ! 🎉");
            setTimeout(() => setSuccessMsg(""), 3000);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (error) {
            console.error(error);
            setGpsError("เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่");
            setTimeout(() => setGpsError(""), 3000);
        } finally {
            setIsSubmittingOT(false);
        }
    };

    // Quest Management State
    const { data: questsData, mutate: mutateQuests } = useSWR("/api/ess/quests", fetcher);
    const [isSubmittingQuest, setIsSubmittingQuest] = useState<string | null>(null);

    const handleQuestAction = async (questId: string, action: 'claim' | 'submit') => {
        setIsSubmittingQuest(questId);
        try {
            const res = await fetch("/api/ess/quests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questId, action })
            });
            if (!res.ok) throw new Error("Failed to update quest");
            mutateQuests();
            if (action === 'claim') {
                setSuccessMsg("🎉 รับภารกิจสำเร็จ! ลุยเลย");
                // Micro-dopamine hit for accepting a quest
                confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 }, colors: ['#f43f5e', '#ec4899'] });
            } else if (action === 'submit') {
                setSuccessMsg("ส่งมอบเควสต์ รอการตรวจสอบ (Review) 🛡️");
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsSubmittingQuest(null);
            setTimeout(() => setSuccessMsg(""), 3000);
        }
    };

    // Expense Management State
    const { data: expenseData, mutate: mutateExpense } = useSWR("/api/ess/expenses", fetcher);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
    const [isHrServicesOpen, setIsHrServicesOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        title: "",
        description: "",
        amount: "",
        expectedDate: new Date().toISOString().split('T')[0],
        category: "OFFICE_SUPPLIES",
        vendorName: "",
        receiptUrl: ""
    });
    const [expenseFile, setExpenseFile] = useState<File | null>(null);

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingExpense(true);
        try {
            let finalReceiptUrl = expenseForm.receiptUrl;

            // Handle physical file upload if a file was selected
            if (expenseFile) {
                const formData = new FormData();
                formData.append("file", expenseFile);
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                });
                if (!uploadRes.ok) throw new Error("อัพโหลดไฟล์ภาพไม่สำเร็จ");
                const uploadData = await uploadRes.json();
                finalReceiptUrl = uploadData.url;
            } else {
                throw new Error("กรุณาแนบรูปใบเสร็จ / สลิปโอนเงิน");
            }

            const res = await fetch("/api/ess/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...expenseForm, receiptUrl: finalReceiptUrl })
            });
            if (!res.ok) throw new Error(await res.text());
            mutateExpense();
            setIsExpenseModalOpen(false);
            setSuccessMsg("ส่งคำขอเบิกจ่ายสำเร็จ! 🎉");
            setTimeout(() => setSuccessMsg(""), 3000);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setExpenseForm({ ...expenseForm, title: "", amount: "", receiptUrl: "" });
            setExpenseFile(null);
        } catch (error: any) {
            alert(error.message || "เกิดข้อผิดพลาด");
            console.error(error);
            setGpsError("เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่");
            setTimeout(() => setGpsError(""), 3000);
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    const handleMoodSubmit = async (moodType: string) => {
        setIsSubmittingMood(true);
        try {
            const res = await fetch("/api/ess/mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood: moodType })
            });
            const responseData = await res.json();

            // Re-fetch to update XP bar instantly
            mutate();
            mutateMood();

            // Fire confetti if XP was gained
            if (responseData.xp && responseData.xp.expGained > 0) {
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#a855f7', '#6366f1'] });
            }

        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingMood(false);
        }
    };

    const handleKudosSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingKudos(true);
        try {
            const res = await fetch("/api/ess/kudos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(kudosForm)
            });
            if (!res.ok) throw new Error(await res.text());

            const responseData = await res.json();

            mutate(); // Re-fetch main profile for XP updates
            mutateKudos();
            setSuccessMsg("ส่งคำชื่นชมและได้รับ EXP พิเศษ! 🎉");
            setIsKudosModalOpen(false);
            setKudosForm({ receiverId: "", badgeType: "THANK_YOU", message: "" });

            // Fire Confetti
            if (responseData.xp?.sender?.expGained > 0) {
                confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 }, colors: ['#f59e0b', '#fbbf24'] });
            }
        } catch (error: any) {
            alert(error.message || "เกิดข้อผิดพลาด");
        } finally {
            setIsSubmittingKudos(false);
        }
    };

    const handleGoalProgressUpdate = async (goalId: string, newValue: number) => {
        setIsUpdatingGoal(goalId);
        try {
            await fetch(`/api/ess/goals/${goalId}/progress`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentValue: newValue })
            });
            mutateGoals();
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdatingGoal(null);
        }
    };

    // Start clock and check milestones on mount
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Check for Birthday or Work Anniversary
    useEffect(() => {
        if (!data || !data.employee) return;

        const todayStr = new Date().toISOString().substring(5, 10);

        const dobStr = data.employee.dob ? new Date(data.employee.dob).toISOString().substring(5, 10) : null;
        const startStr = data.employee.startDate ? new Date(data.employee.startDate).toISOString().substring(5, 10) : null;

        const isBirthday = dobStr === todayStr;
        const isAnniv = startStr === todayStr;

        if (isBirthday || isAnniv) {
            let msg = "";
            if (isBirthday && isAnniv) msg = "สุขสันต์วันเกิด และฉลองครบรอบการทำงานครับ/ค่ะ! 🎉🥳";
            else if (isBirthday) msg = "สุขสันต์วันเกิดครับ/ค่ะ! ขอให้มีความสุขมากๆ 🎂🎁";
            else if (isAnniv) {
                const startYear = new Date(data.employee.startDate).getFullYear();
                const thisYear = new Date().getFullYear();
                const diff = thisYear - startYear;
                msg = diff > 0 ? `ยินดีด้วยกับวันครบรอบ ${diff} ปีในการทำงานกับเรา! 💼🌟` : `ยินดีต้อนรับสู่ครอบครัวเรา! วันแรกของการทำงาน 🎉`;
            }

            setCelebrationMsg(msg);

            // Fire confetti
            let duration = 5 * 1000;
            let animationEnd = Date.now() + duration;
            let defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            let interval: any = setInterval(function () {
                let timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                let particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [data]);

    const handleAttendance = async (action: "CHECK_IN" | "CHECK_OUT") => {
        if (!data || !data.employee) return;

        // Extract MM-DD
        const todayStr = new Date().toISOString().substring(5, 10);

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
                        if (res.status === 400 && result.requiresConfirmation) {
                            if (window.confirm(result.message)) {
                                // Force check-in
                                const forceRes = await fetch("/api/attendance/check-in", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action, lat, lng, forceOutLocation: true })
                                });
                                const forceResult = await forceRes.json();
                                if (!forceRes.ok) {
                                    setGpsError(forceResult.error || "เกิดข้อผิดพลาดในการลงเวลา");
                                } else {
                                    setSuccessMsg(`${forceResult.message} (ความคลาดเคลื่อน ${forceResult.distance}m)`);
                                    mutate();
                                }
                            } else {
                                setGpsError("ยกเลิกการลงเวลา");
                            }
                        } else {
                            setGpsError(result.error || "เกิดข้อผิดพลาดในการลงเวลา");
                        }
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

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingRequest(true);
        try {
            // Combine date with time
            let checkInDate = requestForm.requestedCheckIn ? new Date(`${requestForm.date}T${requestForm.requestedCheckIn}:00`) : null;
            let checkOutDate = requestForm.requestedCheckOut ? new Date(`${requestForm.date}T${requestForm.requestedCheckOut}:00`) : null;

            const res = await fetch("/api/ess/attendance/adjustment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: requestForm.date,
                    requestedCheckIn: checkInDate?.toISOString(),
                    requestedCheckOut: checkOutDate?.toISOString(),
                    reason: requestForm.reason
                })
            });
            if (!res.ok) throw new Error("Failed to submit");
            setSuccessMsg("ส่งคำขอปรับแก้เวลาสำเร็จ กรุณารอ HR อนุมัติ");
            setIsRequestModalOpen(false);
            setRequestForm({ date: new Date().toISOString().split('T')[0], requestedCheckIn: "", requestedCheckOut: "", reason: "" });
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการส่งคำขอ");
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }
        setIsSubmittingPassword(true);
        try {
            const res = await fetch("/api/ess/profile/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
            });
            const dataResult = await res.json();
            if (!res.ok) throw new Error(dataResult.error || "เกิดข้อผิดพลาด");

            setSuccessMsg("เปลี่ยนรหัสผ่านสำเร็จ!");
            setIsPasswordModalOpen(false);
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (error: any) {
            setPasswordError(error.message);
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Celebration Banner */}
            {celebrationMsg && (
                <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 rounded-3xl p-6 shadow-lg text-white text-center relative overflow-hidden animate-in zoom-in duration-500">
                    <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black drop-shadow-md tracking-wide">{celebrationMsg}</h2>
                        <p className="text-sm text-pink-100 mt-2 font-medium">เราดีใจที่ได้มีคุณร่วมสร้างทีมที่แข็งแกร่งไปด้วยกัน!</p>
                    </div>
                </div>
            )}

            {/* Gamified User Profile Target & Level Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/60 text-center relative overflow-hidden">
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="p-2 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-900 transition flex items-center gap-2 text-xs font-semibold"
                        title="เปลี่ยนรหัสผ่าน"
                    >
                        <span className="text-sm">🔑</span>
                    </button>
                </div>

                <div className="relative inline-block mb-3">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white relative z-10">
                        {employee.user.name?.charAt(0) || "U"}
                    </div>
                    {/* Level Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-md border-2 border-white z-20 transform rotate-[-5deg] tracking-wider outline-none">
                        LV.{employee.level || 1}
                    </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 leading-tight">{employee.user.name}</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">{employee.position} &bull; {employee.department?.name || "ไม่มีสังกัด"}</p>

                {/* EXP progression Bar */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/80">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Experience Points</span>
                        <span className="text-xs font-bold text-indigo-600">{employee.currentExp || 0} / 100 XP</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (employee.currentExp || 0))}%` }}
                            transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                            className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 h-3 rounded-full relative"
                        >
                            <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                        </motion.div>
                    </div>

                    {/* Psychology Badges: Streaks and Shields */}
                    <div className="mt-4 flex justify-around text-center pt-4 border-t border-gray-100/80">
                        <div className="flex flex-col items-center group cursor-pointer">
                            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🔥</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Day Streak</span>
                            <span className="text-sm font-black text-orange-500">{employee.attendanceStreak || 0}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🛡️</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Ice Shields</span>
                            <span className="text-sm font-black text-teal-500">{employee.streakFreezes || 0}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🪙</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Quest Coins</span>
                            <span className="text-sm font-black text-amber-500">0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Mood Check-in Widget */}
            {moodData && !moodData.hasSubmittedToday && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 shadow-sm border border-indigo-100 relative overflow-hidden text-center">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-indigo-900 mb-1">วันนี้คุณรู้สึกอย่างไรบ้าง? ☁️</h3>
                        <p className="text-xs text-indigo-700/70 mb-5">เช็คอินอารมณ์ของคุณวันนี้ เพื่อให้เรารู้จักคุณมากขึ้น</p>

                        <div className="flex justify-center gap-4">
                            {[
                                { type: "GREAT", emoji: "🤩", label: "ยอดเยี่ยม" },
                                { type: "GOOD", emoji: "😊", label: "ดีเลย" },
                                { type: "OKAY", emoji: "🙂", label: "เฉยๆ นะ" },
                                { type: "BAD", emoji: "😩", label: "เหนื่อย" }
                            ].map((m) => (
                                <button
                                    key={m.type}
                                    onClick={() => handleMoodSubmit(m.type)}
                                    disabled={isSubmittingMood}
                                    className="group flex flex-col items-center gap-1 transition-transform hover:scale-110 disabled:opacity-50"
                                >
                                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center text-3xl group-hover:shadow-md transition-shadow group-hover:bg-indigo-100/50 border border-indigo-50">
                                        {m.emoji}
                                    </div>
                                    <span className="text-[10px] font-medium text-indigo-800">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Mood Submitted Thank You */}
            {moodData && moodData.hasSubmittedToday && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 shadow-sm border border-emerald-100 text-center flex items-center justify-center gap-3">
                    <span className="text-2xl">🌱</span>
                    <p className="text-sm font-medium text-emerald-800">ขอบคุณที่แชร์ความรู้สึกของคุณวันนี้!</p>
                </div>
            )}
            {/* Wall of Fame / Kudos Feed */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">🌟</span> Wall of Fame
                    </h3>
                    <button
                        onClick={() => setIsKudosModalOpen(true)}
                        className="text-xs font-bold bg-orange-100 text-orange-600 hover:bg-orange-200 py-2 px-3 rounded-full transition-colors flex items-center gap-1"
                    >
                        <span>ส่งดาว ✨</span>
                    </button>
                </div>

                {kudosFeed && kudosFeed.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {kudosFeed.map((kudos: any) => (
                            <div key={kudos.id} className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                        {kudos.badgeType === 'TEAM_PLAYER' ? '🤝' : kudos.badgeType === 'HERO' ? '🦸' : '👏'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 font-medium">
                                            <span className="font-bold text-orange-600">{kudos.sender.name}</span> ชื่นชม <span className="font-bold text-blue-600">{kudos.receiver.user.name}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 italic">&quot;{kudos.message}&quot;</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        ยังไม่มีคำชื่นชมในระบบ มาริเริ่มส่งคำชื่นชมให้เพื่อนร่วมงานกันเถอะ!
                    </div>
                )}
            </div>

            {/* Daily Action Quests Widget */}
            {(questsData?.myQuests?.length > 0 || questsData?.openQuests?.length > 0) && (
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 shadow-lg border border-indigo-500/30 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-5 relative z-10">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-md">
                            <span className="text-2xl">⚔️</span> Daily Action Quests
                        </h3>
                    </div>

                    <div className="space-y-3 relative z-10">
                        <AnimatePresence>
                            {/* My Active Quests */}
                            {questsData?.myQuests?.filter((log: any) => log.status === 'IN_PROGRESS' || log.status === 'REVIEWING').map((log: any) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 pr-3">
                                            <h4 className="font-bold text-sm text-indigo-100">{log.quest.title}</h4>
                                            <p className="text-[10px] text-indigo-300 mt-1 line-clamp-2">{log.quest.description}</p>
                                        </div>
                                        <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-inner">
                                            <span className="text-xs">⚡</span>
                                            <span className="text-[10px] font-black">{log.quest.expReward} XP</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        {log.status === 'IN_PROGRESS' ? (
                                            <button
                                                onClick={() => handleQuestAction(log.questId, 'submit')}
                                                disabled={isSubmittingQuest === log.questId}
                                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transform transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isSubmittingQuest === log.questId ? "กำลังส่งมอบ..." : "ส่งมอบภารกิจ (Submit)"}
                                            </button>
                                        ) : (
                                            <div className="w-full bg-white/5 border border-white/10 text-indigo-200 text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-2 backdrop-blur-sm">
                                                <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                                                ตรวจประเมินผล... (Reviewing)
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Open Quests available to Claim */}
                            {questsData?.openQuests?.slice(0, 3).map((quest: any) => (
                                <motion.div
                                    key={quest.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div className="flex-1 pr-3">
                                            <h4 className="font-bold text-sm text-slate-200 group-hover:text-fuchsia-300 transition-colors">{quest.title}</h4>
                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{quest.description}</p>
                                        </div>
                                        <div className="bg-slate-700 text-slate-300 px-2 py-1 rounded-lg flex flex-col items-center shrink-0">
                                            <span className="text-[10px] font-black">{quest.expReward} XP</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleQuestAction(quest.id, 'claim')}
                                        disabled={isSubmittingQuest === quest.id}
                                        className="mt-3 w-full bg-slate-700 hover:bg-fuchsia-600 hover:text-white text-slate-300 text-xs font-bold py-2 rounded-xl border border-slate-600 hover:border-fuchsia-500 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        รับภารกิจ (Claim Quest)
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {questsData?.myQuests?.length === 0 && questsData?.openQuests?.length === 0 && (
                            <div className="text-center py-6 text-indigo-300/60 text-sm font-medium">
                                ไม่มีภารกิจใหม่ในขณะนี้ วีรบุรุษได้พักผ่อน 🏕️
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* My Goals & KPIs Widget */}
            {goalsData && goalsData.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-2xl">🎯</span> เป้าหมาย & KPI ของฉัน
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {goalsData.map((goal: any) => {
                            const percentage = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                            const isAchieved = goal.status === 'ACHIEVED';

                            return (
                                <div key={goal.id} className={`rounded-2xl p-4 border transition-colors ${isAchieved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className={`font-bold text-sm ${isAchieved ? 'text-green-800' : 'text-gray-900'}`}>{goal.title}</h4>
                                            {goal.description && <p className="text-xs text-gray-500 mt-1">{goal.description}</p>}
                                        </div>
                                        {isAchieved && <span className="text-xl">🏆</span>}
                                    </div>

                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                            <span className={isAchieved ? 'text-green-700' : 'text-purple-600'}>ความคืบหน้า: {percentage}%</span>
                                            <span className="text-gray-500">{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                                            <div
                                                className={`h-2.5 rounded-full ${isAchieved ? 'bg-green-500' : 'bg-purple-500'} transition-all duration-1000 ease-out`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>

                                        {!isAchieved && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={goal.targetValue}
                                                    step={goal.targetValue > 100 ? 5 : 1}
                                                    defaultValue={goal.currentValue}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                    onChange={(e) => {
                                                        // Debounce or update on blur in real app, here we update on change end
                                                    }}
                                                    onMouseUp={(e) => handleGoalProgressUpdate(goal.id, Number((e.target as HTMLInputElement).value))}
                                                    onTouchEnd={(e) => handleGoalProgressUpdate(goal.id, Number((e.target as HTMLInputElement).value))}
                                                />
                                                <span className="text-xs text-gray-400 w-16 text-right">อัปเดต</span>
                                            </div>
                                        )}
                                        {isUpdatingGoal === goal.id && <span className="text-[10px] text-purple-500 italic">กำลังบันทึก...</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* News Stream Widget */}
            {announcements.length > 0 && (
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl p-5 shadow-sm text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -m-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">📢</span>
                        <h3 className="font-bold tracking-wide">ประกาศ & ข่าวสารสื่อสาร</h3>
                    </div>
                    <div className="space-y-4">
                        {announcements.map((news: any) => {
                            const isEvent = news.type === 'EVENT';
                            const isPoll = news.type === 'POLL';

                            // Calculate interactions
                            const myInteraction = news.interactions?.find((i: any) => i.userId === employee.userId);
                            const totalInteractions = news.interactions?.length || 0;

                            return (
                                <div key={news.id} className={`bg-white/10 backdrop-blur-sm border ${myInteraction ? 'border-green-300' : 'border-white/20'} rounded-2xl p-4 transition-all`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                            {isEvent && '📅'} {isPoll && '📊'} {!isEvent && !isPoll && '🗞️'}
                                            {news.title}
                                        </h4>
                                        {myInteraction && <span className="text-[10px] bg-green-500/80 px-2 py-0.5 rounded-full font-bold">ตอบรับแล้ว</span>}
                                    </div>
                                    <p className="text-xs text-white/90 leading-relaxed mb-3 whitespace-pre-wrap">{news.content}</p>

                                    {/* Event RSVP Controls */}
                                    {isEvent && (
                                        <div className="mt-3 bg-white/5 rounded-xl p-3 border border-white/10">
                                            <div className="text-xs font-bold text-purple-200 mb-2">
                                                🗓️ เวลาจัดกิจกรรม: {news.eventDate ? new Date(news.eventDate).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'} น.
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAnnouncementInteract(news.id, 'RSVP_YES')}
                                                    disabled={isInteracting === news.id}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${myInteraction?.action === 'RSVP_YES' ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                                >
                                                    ✅ ไปแน่นอน
                                                </button>
                                                <button
                                                    onClick={() => handleAnnouncementInteract(news.id, 'RSVP_NO')}
                                                    disabled={isInteracting === news.id}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${myInteraction?.action === 'RSVP_NO' ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                                >
                                                    ❌ ไม่สะดวกไป
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Poll Controls */}
                                    {isPoll && news.pollOptions && Array.isArray(news.pollOptions) && (
                                        <div className="mt-3 space-y-2 relative">
                                            {isInteracting === news.id && <div className="absolute inset-0 bg-white/5 rounded-lg backdrop-blur-[2px] z-10 flex items-center justify-center text-xs font-bold">กำลังส่งคำตอบ...</div>}
                                            {news.pollOptions.map((opt: string, idx: number) => {
                                                const actionTag = `VOTE_${idx}`;
                                                const isMyVote = myInteraction?.action === actionTag;
                                                const votesForOpt = news.interactions?.filter((i: any) => i.action === actionTag).length || 0;
                                                const percent = totalInteractions > 0 ? Math.round((votesForOpt / totalInteractions) * 100) : 0;

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleAnnouncementInteract(news.id, actionTag)}
                                                        disabled={isInteracting === news.id}
                                                        className={`w-full relative overflow-hidden text-left rounded-lg border transition-all ${isMyVote ? 'border-purple-300' : 'border-white/10 hover:border-white/30'}`}
                                                    >
                                                        {totalInteractions > 0 && (
                                                            <div className={`absolute top-0 left-0 bottom-0 ${isMyVote ? 'bg-purple-400/40' : 'bg-white/10'} transition-all`} style={{ width: `${percent}%` }}></div>
                                                        )}
                                                        <div className="relative z-10 flex justify-between items-center p-2 text-xs">
                                                            <span className={`font-medium ${isMyVote ? 'text-white' : 'text-white/80'}`}>{opt} {isMyVote && '✓'}</span>
                                                            <span className="text-white/60 text-[10px]">{votesForOpt} โหวต ({percent}%)</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            <div className="text-right text-[10px] text-white/50 pt-1">ผู้ร่วมโหวตทั้งหมด {totalInteractions} คน</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${todayLog.status === 'ON_TIME' ? 'bg-green-100 text-green-700' :
                                todayLog.status === 'OUT_OF_LOCATION' ? 'bg-purple-100 text-purple-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {todayLog.status === 'ON_TIME' ? "มาตรงเวลา" :
                                    todayLog.status === 'OUT_OF_LOCATION' ? "เช็คอินนอกสถานที่" :
                                        "มาสาย (LATE)"}
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 border-t border-gray-100 pt-4 text-center">
                        <button
                            onClick={() => setIsRequestModalOpen(true)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center w-full gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            คลิกที่นี่เพื่อขอแก้เวลาเข้า-ออกงาน
                        </button>
                    </div>
                </div>
            )}

            {/* ====== HR SERVICES TOGGLE ====== */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <button
                    onClick={() => setIsHrServicesOpen(!isHrServicesOpen)}
                    className="w-full flex justify-between items-center p-6 bg-gradient-to-r from-gray-50 to-white hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                            <span className="text-2xl">⚡️</span>
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-gray-900">ศูนย์รวมแบบฟอร์ม & คำร้อง</h3>
                            <p className="text-sm text-gray-500 font-medium mt-0.5">แจ้งลางาน • ขอทำล่วงเวลา (OT) • ระบบเบิกจ่าย</p>
                        </div>
                    </div>
                    <div className={`transform transition-transform duration-300 ${isHrServicesOpen ? 'rotate-180' : ''} bg-gray-100 p-2 rounded-full`}>
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </button>

                {isHrServicesOpen && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/30 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {/* WIDGETS START */}
                        {/* ====== LEAVE WIDGET ====== */}
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-6 shadow-sm border border-blue-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                                    <span>🏖️</span> วันลาคงเหลือ
                                </h3>
                                <button
                                    onClick={() => setIsLeaveModalOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-md active:scale-95"
                                >
                                    + ยื่นขอลางาน
                                </button>
                            </div>

                            {leaveData?.balance ? (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
                                        <div className="text-2xl mb-1">🤒</div>
                                        <div className="text-[10px] font-bold text-gray-500 mb-1">ลาป่วย</div>
                                        <div className="text-lg font-black text-gray-800">{leaveData.balance.sickLeaveTotal - leaveData.balance.sickLeaveUsed} <span className="text-sm font-medium">วัน</span></div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
                                        <div className="text-2xl mb-1">✈️</div>
                                        <div className="text-[10px] font-bold text-gray-500 mb-1">ลาพักร้อน</div>
                                        <div className="text-lg font-black text-blue-600">{leaveData.balance.vacationTotal - leaveData.balance.vacationUsed} <span className="text-sm font-medium">วัน</span></div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
                                        <div className="text-2xl mb-1">📝</div>
                                        <div className="text-[10px] font-bold text-gray-500 mb-1">ลากิจ</div>
                                        <div className="text-lg font-black text-gray-800">{leaveData.balance.personalLeaveTotal - leaveData.balance.personalLeaveUsed} <span className="text-sm font-medium">วัน</span></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-sm text-blue-600 py-4 animate-pulse font-bold">กำลังโหลดสิทธิ์ของคุณ...</div>
                            )}
                        </div>

                        {/* ====== OT WIDGET ====== */}
                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-6 shadow-sm border border-indigo-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                                    <span>⏰</span> วันเวลาล่วงหน้า (OT)
                                </h3>
                                <button
                                    onClick={() => setIsOTModalOpen(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-md active:scale-95"
                                >
                                    + ขอทำโอที
                                </button>
                            </div>

                            {otData?.requests ? (
                                <div className="space-y-3">
                                    {otData.requests.slice(0, 3).map((req: any) => (
                                        <div key={req.id} className="bg-white rounded-2xl p-4 flex justify-between items-center border border-gray-100 shadow-sm">
                                            <div>
                                                <div className="text-sm font-bold text-gray-800">{new Date(req.date).toLocaleDateString('th-TH')} <span className="text-indigo-600 ml-1">({req.calculatedHours} ชม.)</span></div>
                                                <div className="text-xs text-gray-500 mt-0.5">{req.startTime} - {req.endTime} • อัตรา {req.multiplier}x</div>
                                            </div>
                                            <div>
                                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {req.status === 'APPROVED' ? 'อนุมัติแล้ว' : req.status === 'REJECTED' ? 'ไม่อนุมัติ' : 'รออนุมัติ'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {otData.requests.length === 0 && (
                                        <div className="text-center text-sm text-gray-500 py-4">คุณยังไม่มีคำขอทำ OT เดือนนี้</div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-indigo-600 py-4 animate-pulse font-bold">กำลังโหลดประวัติ...</div>
                            )}
                        </div>

                        {/* ====== EXPENSE WIDGET ====== */}
                        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-6 shadow-sm border border-rose-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-rose-900 text-lg flex items-center gap-2">
                                    <span>💸</span> เบิกจ่าย / จัดซื้อ
                                </h3>
                                <button
                                    onClick={() => setIsExpenseModalOpen(true)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-md active:scale-95"
                                >
                                    + ขอเบิกจ่าย
                                </button>
                            </div>

                            {expenseData?.requests ? (
                                <div className="space-y-3">
                                    {expenseData.requests.slice(0, 3).map((req: any) => (
                                        <div key={req.id} className="bg-white rounded-2xl p-4 flex justify-between items-center border border-gray-100 shadow-sm">
                                            <div>
                                                <div className="text-sm font-bold text-gray-800">{req.title} <span className="text-rose-600 ml-1">({req.amount.toLocaleString()} ฿)</span></div>
                                                <div className="text-xs text-gray-500 mt-0.5">{req.category} • {new Date(req.createdAt).toLocaleDateString('th-TH')}</div>
                                            </div>
                                            <div>
                                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'PAID' ? 'bg-indigo-100 text-indigo-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {req.status === 'APPROVED' ? 'อนุมัติแล้ว' : req.status === 'PAID' ? 'จ่ายเงินแล้ว' : req.status === 'REJECTED' ? 'ไม่อนุมัติ' : 'รอตรวจสอบ'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {expenseData.requests.length === 0 && (
                                        <div className="text-center text-sm text-gray-500 py-4">คุณยังไม่มีคำขอเบิกจ่าย</div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-rose-600 py-4 animate-pulse font-bold">กำลังโหลดประวัติเบิกจ่าย...</div>
                            )}
                        </div>
                        {/* WIDGETS END */}
                    </div>
                )}
            </div>

            {/* Request Modal */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                            <h3 className="font-bold text-gray-900 text-lg">ขอแก้เวลาทำงาน</h3>
                            <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ต้องการแก้ <span className="text-red-500">*</span></label>
                                <input type="date" required value={requestForm.date} onChange={e => setRequestForm({ ...requestForm, date: e.target.value })} className="w-full text-sm border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเข้าใหม่</label>
                                    <input type="time" value={requestForm.requestedCheckIn} onChange={e => setRequestForm({ ...requestForm, requestedCheckIn: e.target.value })} className="w-full text-sm border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาออกใหม่</label>
                                    <input type="time" value={requestForm.requestedCheckOut} onChange={e => setRequestForm({ ...requestForm, requestedCheckOut: e.target.value })} className="w-full text-sm border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผล <span className="text-red-500">*</span></label>
                                <textarea required rows={2} value={requestForm.reason} onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })} placeholder="เช่น ลืมสแกนนิ้ว, ปรึกษาลูกค้านอกสถานที่..." className="w-full text-sm border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"></textarea>
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={isSubmittingRequest} className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50">
                                    {isSubmittingRequest ? "กำลังส่ง..." : "ส่งคำขอ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Kudos Modal */}
            {isKudosModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-orange-50/50">
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><span>✨</span> ส่งคำชื่นชม (Kudos)</h3>
                            <button onClick={() => setIsKudosModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleKudosSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ส่งให้ใคร?</label>
                                <select
                                    required
                                    value={kudosForm.receiverId}
                                    onChange={e => setKudosForm({ ...kudosForm, receiverId: e.target.value })}
                                    className="w-full text-sm border border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 shadow-sm p-3"
                                >
                                    <option value="" disabled>เลือกเพื่อนร่วมงาน...</option>
                                    {colleaguesData?.filter((c: any) => c.userId !== employee.userId).map((c: any) => (
                                        <option key={c.id} value={c.id}>
                                            {c.user.name} ({c.department?.name || "ไม่มีแผนก"})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกป้ายแห่งความสำเร็จ (Badge)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { type: 'THANK_YOU', icon: '👏', label: 'ขอบคุณ' },
                                        { type: 'TEAM_PLAYER', icon: '🤝', label: 'เพื่อนร่วมทีมยอดเยี่ยม' },
                                        { type: 'HERO', icon: '🦸', label: 'ฮีโร่ผู้ช่วยกู้สถานการณ์' }
                                    ].map(badge => (
                                        <div
                                            key={badge.type}
                                            onClick={() => setKudosForm({ ...kudosForm, badgeType: badge.type })}
                                            className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${kudosForm.badgeType === badge.type ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-orange-200 bg-white'}`}
                                        >
                                            <div className="text-2xl mb-1">{badge.icon}</div>
                                            <div className={`text-[10px] font-bold ${kudosForm.badgeType === badge.type ? 'text-orange-700' : 'text-gray-500'}`}>{badge.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ข้อความชื่นชม <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows={3}
                                    value={kudosForm.message}
                                    onChange={e => setKudosForm({ ...kudosForm, message: e.target.value })}
                                    placeholder="เขียนสิ่งดีๆ ที่อยากบอกเพื่อน..."
                                    className="w-full text-sm border border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 shadow-sm p-3"
                                ></textarea>
                            </div>

                            <div className="pt-2">
                                <button type="submit" disabled={isSubmittingKudos || !kudosForm.receiverId} className="w-full py-3 px-4 bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-600 text-white font-bold rounded-xl transition-colors shadow-md disabled:opacity-50">
                                    {isSubmittingKudos ? "กำลังส่งดาว..." : "🚀 ส่งคำชื่นชมเลย!"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">🔑 เปลี่ยนรหัสผ่าน</h3>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                            {passwordError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                                    {passwordError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสผ่านปัจจุบัน</label>
                                <input required type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm text-gray-900" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสผ่านใหม่</label>
                                <input required type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm text-gray-900" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                                <input required type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm text-gray-900" placeholder="••••••••" />
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={isSubmittingPassword} className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold transition-all disabled:opacity-50">
                                    {isSubmittingPassword ? "กำลังเปลี่ยน..." : "ยืนยันการตั้งรหัสผ่าน"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Leave Request Modal */}
            {isLeaveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">🏖️ แบบฟอร์มขอลางาน</h3>
                            <button onClick={() => setIsLeaveModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-white rounded-full">
                                ✕
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5 custom-scrollbar">
                            <form id="leave-form" onSubmit={handleLeaveSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ประเภทการลา</label>
                                    <select required value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium">
                                        <option value="SICK">🤒 ลาป่วย</option>
                                        <option value="VACATION">✈️ ลาพักร้อน</option>
                                        <option value="PERSONAL">📝 ลากิจ</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">วันที่เริ่มต้น</label>
                                        <input required type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">วันที่สิ้นสุด</label>
                                        <input required type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">เวลาเริ่มลา</label>
                                        <input required type="time" value={leaveForm.startTime} onChange={e => setLeaveForm({ ...leaveForm, startTime: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">เวลาสิ้นสุด</label>
                                        <input required type="time" value={leaveForm.endTime} onChange={e => setLeaveForm({ ...leaveForm, endTime: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">จำนวนชั่วโมงที่ลา (1 วันเต็ม = 8 ชม)</label>
                                    <input required type="number" step="0.5" value={leaveForm.requestedHours} onChange={e => setLeaveForm({ ...leaveForm, requestedHours: parseFloat(e.target.value) })} className="w-full px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="เช่น 8 หรือ 4.5" />
                                    <p className="text-[10px] text-gray-500 mt-1">* หากรวมเวลาพักเที่ยง สามารถลบชั่วโมงพักออกได้เองเลย</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เหตุผลการลา</label>
                                    <textarea required rows={2} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="ระบุเหตุผลย่อๆ..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <button form="leave-form" type="submit" disabled={isSubmittingLeave} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                                {isSubmittingLeave ? "กำลังส่งคำขอ..." : "ยืนยันการลางาน"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overtime Request Modal */}
            {isOTModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
                            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">⏰ แบบฟอร์มขอทำโอที (OT)</h3>
                            <button onClick={() => setIsOTModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-white rounded-full">
                                ✕
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5 custom-scrollbar">
                            <form id="ot-form" onSubmit={handleOTSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">วันที่ทำ OT</label>
                                    <input required type="date" value={otForm.date} onChange={e => setOTForm({ ...otForm, date: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">เวลาเริ่ม</label>
                                        <input required type="time" value={otForm.startTime} onChange={e => setOTForm({ ...otForm, startTime: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">เวลาเลิกจริง</label>
                                        <input required type="time" value={otForm.endTime} onChange={e => setOTForm({ ...otForm, endTime: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">อัตราคูณ (x)</label>
                                        <select required value={otForm.multiplier} onChange={e => setOTForm({ ...otForm, multiplier: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium">
                                            <option value="1.0">1.0x (วันทำงาน)</option>
                                            <option value="1.5">1.5x (ล่วงหน้า)</option>
                                            <option value="3.0">3.0x (วันหยุด)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">จำนวนชั่วโมง</label>
                                        <input required type="number" step="0.5" value={otForm.calculatedHours} onChange={e => setOTForm({ ...otForm, calculatedHours: parseFloat(e.target.value) })} className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="เช่น 2.5" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เหตุผลหรือเนื้องานที่ทำ</label>
                                    <textarea required rows={2} value={otForm.reason} onChange={e => setOTForm({ ...otForm, reason: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="ระบุสิ่งที่ต้องทำล่วงเวลา..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <button form="ot-form" type="submit" disabled={isSubmittingOT} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                                {isSubmittingOT ? "กำลังส่งคำขอ..." : "ส่งคำขอทำโอที"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Request Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-rose-50">
                            <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">💸 ฟอร์มขอเบิกจ่าย / จัดซื้อ</h3>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-white rounded-full">
                                ✕
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5 custom-scrollbar">
                            <form id="expense-form" onSubmit={handleExpenseSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">หัวข้อการเบิก</label>
                                    <input required type="text" value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm" placeholder="เช่น ค่าทางด่วน, ค่าอุปกรณ์..." />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">หมวดหมู่</label>
                                        <select required value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-medium">
                                            <option value="TRAVEL">ค่าเดินทาง/ที่พัก</option>
                                            <option value="MARKETING">ค่าการตลาด</option>
                                            <option value="OFFICE_SUPPLIES">อุปกรณ์สำนักงาน</option>
                                            <option value="MEALS">ค่าอาหาร/รับรอง</option>
                                            <option value="OTHER">อื่นๆ</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">จำนวนเงิน (บาท)</label>
                                        <input required type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm" placeholder="เช่น 550.00" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">แนบรูปใบเสร็จ / สลิปโอนเงิน <span className="text-red-500">*</span></label>
                                    <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            required
                                            accept="image/*"
                                            onChange={e => setExpenseFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {expenseFile ? (
                                            <div className="text-sm font-medium text-rose-600 flex flex-col items-center gap-1">
                                                <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                {expenseFile.name}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 flex flex-col items-center gap-1">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                คลิกเพื่ออัพโหลดรูปภาพ
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียดเพิ่มเติม</label>
                                    <textarea rows={2} value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm" placeholder="ระบุเหตุผล..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <button form="expense-form" type="submit" disabled={isSubmittingExpense} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                                {isSubmittingExpense ? "กำลังส่งคำขอ..." : "ส่งคำขอเบิกจ่าย"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
