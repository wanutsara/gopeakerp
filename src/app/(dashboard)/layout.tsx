"use client";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 w-full relative outline-none overflow-y-auto hidden-scrollbar">
                {children}
            </main>
        </div>
    );
}
