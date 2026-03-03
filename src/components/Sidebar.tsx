"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

const navigation = [
    { name: "แดชบอร์ด", href: "/dashboard", icon: "📊" },
    {
        name: "ฝ่ายขาย / CRM",
        icon: "💼",
        children: [
            { name: "ใบเสนอราคา (Quotations)", href: "/crm/quotations" },
        ]
    },
    {
        name: "จัดการออร์เดอร์ (OMS)",
        icon: "📦",
        children: [
            { name: "คลังสินค้ากลาง (Products)", href: "/oms/products" },
            { name: "นำเข้าออร์เดอร์ (Import)", href: "/oms/import" },
        ]
    },
    {
        name: "การเงิน (Finance)",
        icon: "💰",
        children: [
            { name: "กระแสเงินสด (Cash Flow)", href: "/finance/cashflow" },
        ]
    },
    {
        name: "ระบบบุคคล (HR)",
        icon: "👥",
        children: [
            { name: "รายชื่อพนักงาน", href: "/hr" },
            { name: "แผนก (Departments)", href: "/hr/departments" },
            { name: "เงินเดือน (Payroll)", href: "/hr/payroll" },
            { name: "วันลา (Leaves)", href: "/hr/leave" },
            { name: "ตั้งค่าระบบ (Settings)", href: "/hr/settings" },
        ]
    },
    {
        name: "ตั้งค่า (Settings)",
        icon: "⚙️",
        children: [
            { name: "จัดการสิทธิ์ใช้งาน (Roles)", href: "/settings/roles" },
        ]
    },
    {
        name: "ลงเวลาของฉัน (My ESS)",
        href: "/ess/dashboard",
        icon: "⏱️"
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Auto-open menu if child is active
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const item of navigation) {
            if (item.children && item.children.some(child => pathname.startsWith(child.href) && child.href !== "/hr" || (child.href === "/hr" && (pathname === "/hr" || pathname.startsWith("/hr/create") || pathname.match(/^\/hr\/[a-zA-Z0-9]+$/))))) {
                initial[item.name] = true;
            } else if (item.children && pathname.startsWith('/hr')) {
                initial[item.name] = true; // fallback
            }
        }
        return initial;
    });

    const toggleMenu = (name: string) => {
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    if (!session) return null; // Don't show sidebar if not logged in

    return (
        <div className="flex w-64 flex-col bg-white border-r border-gray-200 min-h-screen">
            <div className="flex h-16 shrink-0 items-center px-6">
                <h1 className="text-xl font-bold tracking-tight text-blue-600">Tamaya ERP</h1>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
                <nav className="flex-1 space-y-1.5 px-4 py-4">
                    {navigation.map((item) => {
                        const hasChildren = !!item.children;
                        // For flat items
                        if (!hasChildren) {
                            const isActive = pathname.startsWith(item.href || "");
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href!}
                                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                >
                                    <span className="mr-3 text-lg">{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        }

                        // For nested items
                        const isOpen = openMenus[item.name];
                        const isChildActive = item.children!.some(child => pathname.startsWith(child.href) && child.href !== "/hr" || (child.href === "/hr" && (pathname === "/hr" || pathname.startsWith("/hr/create") || pathname.match(/^\/hr\/[a-zA-Z0-9]+$/))));

                        return (
                            <div key={item.name} className="space-y-1">
                                <button
                                    onClick={() => toggleMenu(item.name)}
                                    className={`w-full group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-colors ${isChildActive ? "bg-blue-50/50 text-blue-700" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <span className="mr-3 text-lg">{item.icon}</span>
                                        {item.name}
                                    </div>
                                    <svg
                                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                {isOpen && (
                                    <div className="pl-11 pr-2 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                        {item.children!.map(child => {
                                            // Special matching logic because /hr is root, so /hr/payroll matches /hr
                                            const isExactChildActive = (child.href === "/hr" && (pathname === "/hr" || pathname.startsWith("/hr/create") || pathname.match(/^\/hr\/[a-zA-Z0-9]+$/))) ||
                                                (child.href !== "/hr" && pathname.startsWith(child.href));
                                            return (
                                                <Link
                                                    key={child.name}
                                                    href={child.href}
                                                    className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isExactChildActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                                        }`}
                                                >
                                                    {child.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-4 px-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shrink-0">
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
