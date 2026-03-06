"use client";
import Sidebar from "@/components/Sidebar";
import Noticenter from "@/components/Noticenter";
import GlobalBrandSelector from "@/components/GlobalBrandSelector";
import { BrandProvider } from "@/context/BrandContext";
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <BrandProvider>
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col w-full relative outline-none overflow-hidden hidden-scrollbar">
                    {/* Global Top Bar */}
                    <header className="h-16 flex items-center justify-end px-6 bg-white border-b border-gray-100 shrink-0 shadow-sm z-40">
                        <GlobalBrandSelector />
                        <Noticenter />
                    </header>

                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </BrandProvider>
    );
}
