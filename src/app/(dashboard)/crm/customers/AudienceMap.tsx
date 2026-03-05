'use client';

import dynamic from 'next/dynamic';

const AudienceMapClient = dynamic(() => import('./AudienceMapClient'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[500px] rounded-3xl bg-gray-50 flex flex-col items-center justify-center border border-gray-200 shadow-inner">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Initializing AI Spatial Engine...</div>
        </div>
    )
});

export default function AudienceMap({ customers }: { customers: any[] }) {
    return <AudienceMapClient customers={customers} />;
}
