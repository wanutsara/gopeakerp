"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navigation = [
    { name: "แดชบอร์ด", href: "/dashboard", icon: "📊" },
    { name: "จัดการพนักงาน (HR)", href: "/hr", icon: "👥" },
    { name: "โครงสร้างองค์กร/แผนก", href: "/hr/departments", icon: "🏢" },
    { name: "ระบบเงินเดือน (Payroll)", href: "/hr/payroll", icon: "💸" },
    { name: "ระบบวันลา (Leave)", href: "/hr/leave", icon: "🏖️" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    if (!session) return null; // Don't show sidebar if not logged in

    return (
        <div className="flex w-64 flex-col bg-white border-r border-gray-200 min-h-screen">
            <div className="flex h-16 shrink-0 items-center px-6">
                <h1 className="text-xl font-bold tracking-tight text-blue-600">Tamaya ERP</h1>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
                <nav className="flex-1 space-y-1 px-4 py-4">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className="mr-3 text-lg">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-4 px-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        {session.user?.name?.[0] || session.user?.email?.[0] || "?"}
                    </div>
                    <div className="ml-3 truncate">
                        <p className="text-sm font-medium text-gray-900 truncate">{session.user?.name || "User"}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
                >
                    ออกจากระบบ
                </button>
            </div>
        </div>
    );
}
