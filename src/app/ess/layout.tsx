import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import Noticenter from "@/components/Noticenter";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-24 relative overflow-hidden">
            {/* Top Navigation */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
                            SS
                        </div>
                        <h1 className="font-bold text-gray-900 tracking-tight">ระบบบริการพนักงาน</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {session && <Noticenter />}
                        {session && <LogoutButton />}
                    </div>
                </div>
            </header>

            {/* Main Content Area (Mobile Constrained) */}
            <main className="flex-1 w-full max-w-md mx-auto relative px-4 py-6">
                {children}
            </main>

            {/* Mobile-First Bottom Navigation Bar (Glassmorphism) */}
            {session && (
                <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-gray-50 via-white/80 to-transparent backdrop-blur-md border-t border-gray-200/50">
                    <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl rounded-full shadow-lg border border-white/60 p-2 flex justify-between items-center px-4">
                        <Link href="/ess/dashboard" className="flex flex-col items-center justify-center w-16 h-12 rounded-full hover:bg-gray-100/50 transition-colors group relative">
                            <span className="text-xl mb-0.5 group-hover:-translate-y-1 transition-transform">🏠</span>
                            <span className="text-[9px] font-bold text-gray-500">Home</span>
                        </Link>

                        <Link href="/ess/quests" className="flex flex-col items-center justify-center w-16 h-12 rounded-full hover:bg-gray-100/50 transition-colors group relative">
                            <span className="text-xl mb-0.5 group-hover:-translate-y-1 transition-transform">🎯</span>
                            <span className="text-[9px] font-bold text-gray-500">Quests</span>
                        </Link>

                        <Link href="/ess/wallet" className="flex flex-col items-center justify-center w-16 h-12 rounded-full hover:bg-gray-100/50 transition-colors group relative">
                            <span className="text-xl mb-0.5 group-hover:-translate-y-1 transition-transform">💸</span>
                            <span className="text-[9px] font-bold text-gray-500">Wallet</span>
                        </Link>

                        <Link href="/ess/dashboard" className="flex flex-col items-center justify-center w-16 h-12 rounded-full hover:bg-gray-100/50 transition-colors group relative">
                            <span className="text-xl mb-0.5 group-hover:-translate-y-1 transition-transform">🧑</span>
                            <span className="text-[9px] font-bold text-gray-500">Profile</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
