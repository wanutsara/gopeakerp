import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import Noticenter from "@/components/Noticenter";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
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
        </div>
    );
}
