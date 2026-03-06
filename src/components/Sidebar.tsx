"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

// The Module enum governs which Workspace this menu belongs to.
// If module is undefined, it is considered Public (e.g. ESS).
const navigation = [
    {
        name: "บอร์ดผู้บริหาร (Executive)",
        href: "/dashboard",
        icon: "👑",
        module: "EXECUTIVE"
    },
    {
        name: "ระบบพนักงาน (ESS)",
        icon: "📱",
        children: [
            { name: "แผงควบคุมหลัก (My ESS)", href: "/ess/dashboard" },
            { name: "ศูนย์บัญชาการ (Center of Work)", href: "/ess/workspace" },
            { name: "ลานรับภารกิจ (Quest Board)", href: "/ess/quests" },
            { name: "เส้นทางเป้าหมาย (My OKRs)", href: "/ess/goals" },
            { name: "สเตตัสตัวละคร (RPG Profile)", href: "/ess/profile" }
        ]
        // No module = everyone sees this
    },
    {
        name: "ฝ่ายขาย / CRM",
        icon: "💼",
        module: "OMS",
        children: [
            { name: "ฐานข้อมูลลูกค้า (Customers)", href: "/crm/customers" },
            { name: "ตรวจสอบรายชื่อซ้ำ (Resolution)", href: "/crm/resolution" },
            { name: "ใบเสนอราคา (Quotations)", href: "/crm/quotations" },
        ]
    },
    {
        name: "ปฏิบัติการ (OMS)",
        icon: "📦",
        module: "OMS",
        children: [
            // Daily Operations
            { name: "🛒 ยอดขายรายวัน (Daily Revenue)", href: "/oms/orders" },
            { name: "⚡ นำเข้าออร์เดอร์ (Import)", href: "/oms/import" },
            { name: "🤖 ลดแชทป้อนบิลด้วย AI (Parser)", href: "/oms/parser" },
            // Inventory & Assets
            { name: "🛍️ ศูนย์รวมสินค้า (Products)", href: "/oms/products" },
            { name: "🏢 จัดการคลัง (Locations)", href: "/oms/settings/locations" },
            // Supply Chain 
            { name: "🚚 จัดซื้อ & ก้อน FIFO (Procurement)", href: "/oms/procurement" },
            { name: "🔄 รับคืนสินค้า & AI Vision (RMA)", href: "/oms/returns" },
            // Intelligence
            { name: "💡 ผู้ช่วยการเงิน AI (Copilot)", href: "/oms/finance" },
        ]
    },
    {
        name: "การตลาด (Marketing)",
        icon: "🎯",
        module: "OMS",
        children: [
            { name: "ระบุค่าโฆษณา (Ad Spend Log)", href: "/marketing/ads" },
        ]
    },
    {
        name: "การเงิน (Finance)",
        icon: "💰",
        module: "FINANCE",
        children: [
            // Headquarters
            { name: "👑 แดชบอร์ดการเงิน (CFO View)", href: "/finance/dashboard" },
            { name: "🏦 สมุดบัญชีบริษัท (Bank Vault)", href: "/finance/bank-accounts" },
            // Revenue & Reconciliation
            { name: "🧾 กระทบยอด (Reconcile)", href: "/finance/reconciliation" },
            { name: "📈 กระแสเงินสด (Cash Flow)", href: "/finance/cashflow" },
            { name: "🗺️ แผนผังเงินสด (Cash Flow Map)", href: "/finance/cashflow-map" },
            // Payables (AP)
            { name: "📤 ศูนย์อนุมัติจ่าย (AP Desk)", href: "/finance/ap" },
            { name: "🛍️ รายการตั้งเบิก (Expenses)", href: "/finance/expenses" },
        ]
    },
    {
        name: "งานบุคคล (HR)",
        icon: "👥",
        module: "HR",
        children: [
            // Core
            { name: "👑 แดชบอร์ด 10X (Analytics)", href: "/hr/dashboard" },
            { name: "👤 รายชื่อพนักงาน (Employees)", href: "/hr" },
            { name: "🏢 โครงสร้างบริษัท (Org Chart)", href: "/hr/org-chart" },
            { name: "🌐 ออฟฟิศ 3 มิติ (Virtual Office)", href: "/hr/virtual-office" },
            { name: "📂 แผนก (Departments)", href: "/hr/departments" },
            // Time Management
            { name: "⏱️ สรุปการลงเวลา (The Pulse)", href: "/hr/attendance" },
            { name: "🏖️ อนุมัติวันลา (Leaves)", href: "/hr/leave" },
            { name: "🌙 จัดการล่วงเวลา (OT)", href: "/hr/overtime" },
            // Payroll & Finance
            { name: "💰 สรุปเงินเดือน (Payroll)", href: "/hr/payroll" },
            { name: "📉 จุดปันส่วนค่าใช้จ่าย (Allocation)", href: "/hr/payroll-allocation" },
            { name: "💸 อนุมัติเบิกจ่าย (Expenses)", href: "/hr/expenses" },
            // Performance & Engagement
            { name: "🎯 เป้าหมาย OKR (Goals)", href: "/hr/goals" },
            { name: "🌳 ผังทิศทางบริษัท (Alignment)", href: "/hr/alignment" },
            { name: "⚔️ แจกจ่ายภารกิจ (Quest Master)", href: "/hr/quests" },
            { name: "📢 ประกาศบอร์ดข่าว (News)", href: "/hr/announcements" }
        ]
    },
    {
        name: "ตั้งค่าองค์กร (Settings)",
        icon: "⚙️",
        module: "EXECUTIVE",
        children: [
            { name: "แผงควบคุมสิทธิ์ (Roles Matrix)", href: "/settings/roles" },
            { name: "ตั้งค่าระบบ (System Core)", href: "/settings/system" },
            { name: "ตั้งค่า HR (HR Settings)", href: "/hr/settings" },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const item of navigation) {
            if (item.children && item.children.some(child => pathname.startsWith(child.href) && child.href !== "/hr" || (child.href === "/hr" && (pathname === "/hr" || pathname.startsWith("/hr/create") || pathname.match(/^\/hr\/(?!attendance|departments|payroll|leave|settings)[a-zA-Z0-9_-]+$/))))) {
                initial[item.name] = true;
            } else if (item.children && item.name === "ระบบบุคคล (HR)" && pathname.startsWith('/hr') && !pathname.startsWith('/hr/settings')) {
                initial[item.name] = true;
            } else if (item.children && item.name === "ระบบพนักงาน (ESS)" && pathname.startsWith('/ess')) {
                initial[item.name] = true;
            } else if (item.children && item.name === "ตั้งค่าองค์กร (Settings)" && (pathname.startsWith('/settings') || pathname.startsWith('/hr/settings'))) {
                initial[item.name] = true;
            }
        }
        return initial;
    });

    const toggleMenu = (name: string) => {
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    if (!session) return null;

    // --- Dynamic Access Control Filter ---
    const userRole = session.user?.role;
    const userPermissions = (session.user as any)?.permissions || [];

    const filteredNavigation = navigation.filter(item => {
        // OWNER sees the entire universe
        if (userRole === "OWNER") return true;

        // ESS is universally visible
        if (!item.module) return true;

        // Check array for module read access
        const hasAccess = userPermissions.some((p: any) => p.module === item.module && p.canRead);
        return hasAccess;
    });

    return (
        <div className="flex w-64 flex-col bg-white border-r border-gray-200 min-h-screen">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-100 bg-gray-900">
                <h1 className="text-xl font-black tracking-tight text-white">GOPEAK <span className="text-blue-500">ERP</span></h1>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50/50">
                <nav className="flex-1 space-y-2 px-4 py-6">
                    {filteredNavigation.map((item) => {
                        const hasChildren = !!item.children;

                        if (!hasChildren) {
                            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href || ""));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href!}
                                    className={`group flex items-center px-4 py-3 text-[13px] font-bold rounded-xl transition-all ${isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                        : "text-gray-600 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-gray-200"
                                        }`}
                                >
                                    <span className={`mr-3 text-lg ${isActive ? '' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform'}`}>{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        }

                        const isOpen = openMenus[item.name];
                        const isChildActive = item.children!.some(child => pathname.startsWith(child.href) && child.href !== "/hr" || (child.href === "/hr" && (pathname === "/hr" || pathname.startsWith("/hr/create") || pathname.match(/^\/hr\/(?!attendance|departments|payroll|leave|settings)[a-zA-Z0-9_-]+$/))));

                        return (
                            <div key={item.name} className="space-y-1">
                                <button
                                    onClick={() => toggleMenu(item.name)}
                                    className={`w-full group flex items-center justify-between px-4 py-3 text-[13px] font-bold rounded-xl transition-all ${isChildActive ? "bg-blue-50 text-blue-700 border border-blue-100" : "text-gray-600 hover:bg-white hover:text-blue-600 border border-transparent hover:border-gray-200 hover:shadow-sm"
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <span className={`mr-3 text-lg ${isChildActive ? '' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform'}`}>{item.icon}</span>
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
                                    <div className="pl-11 pr-2 py-1 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                        {item.children!.map(child => {
                                            const isExactChildActive = (child.href === "/hr" && (pathname === "/hr" || pathname.startsWith("/hr/create") || pathname.match(/^\/hr\/(?!attendance|departments|payroll|leave|settings)[a-zA-Z0-9_-]+$/))) ||
                                                (child.href !== "/hr" && pathname === child.href) ||
                                                (child.href !== "/hr" && child.href !== "/dashboard" && pathname.startsWith(child.href));
                                            return (
                                                <Link
                                                    key={child.name}
                                                    href={child.href}
                                                    className={`block px-4 py-2.5 text-[12px] font-bold rounded-lg transition-colors ${isExactChildActive ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
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

            <div className="p-5 border-t border-gray-200 bg-white">
                <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shrink-0 shadow-sm border border-blue-200">
                        {session.user?.name?.[0] || session.user?.email?.[0] || "?"}
                    </div>
                    <div className="ml-3 truncate">
                        <p className="text-sm font-black text-gray-900 truncate tracking-tight">{session.user?.name || "Employee"}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 truncate mt-0.5 px-2 bg-emerald-50 rounded-full inline-block">{session.user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-center px-4 py-2.5 text-[12px] text-red-600 font-bold hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-100"
                >
                    SIGN OUT
                </button>
            </div>
        </div>
    );
}
