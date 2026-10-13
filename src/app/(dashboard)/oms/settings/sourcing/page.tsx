'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { useBrand } from '@/context/BrandContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import SourcingSettingsModal from '../../sourcing/SourcingSettingsModal';
import { SourcingConfigData } from '@/lib/sourcingCost';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
};

export default function SourcingSettingsPage() {
    const { activeBrandId } = useBrand();
    const { data: config, mutate } = useSWR<SourcingConfigData>(
        `/api/oms/sourcing/settings${activeBrandId ? `?brandId=${activeBrandId}` : ''}`,
        fetcher
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            <div className="flex items-center justify-between">
                <Link
                    href="/oms/sourcing"
                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-600 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>กลับไปหน้าค้นหาสินค้า & ไปป์ไลน์ (/oms/sourcing)</span>
                </Link>
            </div>

            <SourcingSettingsModal
                isOpen={true}
                asPage={true}
                initialConfig={config}
                brandId={activeBrandId}
                onSaved={(newConfig) => mutate(newConfig, false)}
            />
        </div>
    );
}
