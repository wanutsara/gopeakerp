import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { UserCircleIcon, FireIcon } from '@heroicons/react/24/solid';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

interface InitiativeData {
    id: string;
    title: string;
    description: string | null;
    status: string;
    progress: number;
    expReward: number;
    coinReward: number;
    ownerName: string | null;
    ownerImage: string | null;
}

export default function InitiativeNode({ data }: { data: InitiativeData }) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-500 text-white border-emerald-600';
            case 'IN_PROGRESS': return 'bg-amber-400 text-white border-amber-500';
            default: return 'bg-gray-200 text-gray-700 border-gray-300';
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow w-64 flex flex-col overflow-hidden relative group">
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                className="w-3 h-3 bg-emerald-500 border-2 border-white rounded-full -translate-y-[2px]"
            />

            <div className={`px-4 py-2 border-b flex justify-between items-center ${getStatusColor(data.status)}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider">Action Plan</div>
                <div className="text-[10px] font-bold px-2 py-0.5 bg-white/20 rounded-full">
                    {data.status.replace('_', ' ')}
                </div>
            </div>

            <div className="p-3 flex flex-col gap-2">
                <div className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{data.title}</div>
                {data.description && <p className="text-xs text-gray-500 line-clamp-2">{data.description}</p>}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                    <div className="flex items-center gap-2">
                        {data.ownerImage ? (
                            <img src={data.ownerImage} alt={data.ownerName || 'owner'} className="w-6 h-6 rounded-full border border-gray-200" />
                        ) : (
                            <UserCircleIcon className="w-6 h-6 text-gray-300" />
                        )}
                        <span className="text-xs font-medium text-gray-600 truncate max-w-[80px]">{data.ownerName || 'Unassigned'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {(data.expReward > 0 || data.coinReward > 0) && (
                            <div className="flex gap-1.5 p-1 bg-gray-50 rounded-md border border-gray-100">
                                {data.expReward > 0 && (
                                    <div className="flex items-center text-[10px] text-blue-600 font-bold" title="EXP">
                                        <AcademicCapIcon className="w-3 h-3 mr-0.5" />
                                        {data.expReward}
                                    </div>
                                )}
                                {data.coinReward > 0 && (
                                    <div className="flex items-center text-[10px] text-amber-500 font-bold" title="Coins">
                                        <FireIcon className="w-3 h-3 mr-0.5" />
                                        {data.coinReward}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
