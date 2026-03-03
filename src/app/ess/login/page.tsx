"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function EssLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
                setIsLoading(false);
            } else {
                // Determine routing based on role happens via middleware usually, 
                // but we explicitly push them to /ess/dashboard here
                router.push("/ess/dashboard");
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center flex-col items-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
                        <span className="text-3xl font-bold text-white">HR</span>
                    </div>
                    <h2 className="text-center text-2xl font-extrabold text-gray-900 tracking-tight">
                        เข้าสู่ระบบพนักงาน
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        สำหรับลงเวลาเข้า-ออกงาน (ESS Portal)
                    </p>
                </div>

                <div className="mt-8 bg-white py-8 px-6 sm:px-10 shadow-xl shadow-gray-200/50 rounded-3xl border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                อีเมล (Email)
                            </label>
                            <div className="mt-2 text-gray-900">
                                <input
                                    type="email"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                รหัสผ่าน (Password)
                            </label>
                            <div className="mt-2 text-gray-900">
                                <input
                                    type="password"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                            >
                                {isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
