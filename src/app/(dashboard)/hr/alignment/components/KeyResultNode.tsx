import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { UserCircleIcon } from '@heroicons/react/24/solid';

interface KeyResultData {
    id: string;
    title: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    progress: number;
    ownerName: string | null;
    ownerImage: string | null;
}

export default function KeyResultNode({ data }: { data: KeyResultData }) {
    return (
        <div className="bg-white border-2 border-sky-400 rounded-xl shadow-md w-64 flex flex-col overflow-hidden relative">
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                className="w-3 h-3 bg-indigo-500 border-2 border-white rounded-full -translate-y-[2px]"
            />

            <div className="bg-gradient-to-r from-sky-50 to-white px-4 py-3 border-b border-gray-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-1">Key Result</div>
                <div className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{data.title}</div>
            </div>

            <div className="p-3 bg-white flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Target</span>
                        <span className="text-sm font-bold text-gray-700">{data.currentValue} / {data.targetValue} {data.unit}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {data.ownerImage ? (
                            <img src={data.ownerImage} alt={data.ownerName || 'owner'} className="w-6 h-6 rounded-full border border-gray-200" />
                        ) : (
                            <UserCircleIcon className="w-6 h-6 text-gray-300" />
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, Math.min(100, data.progress))}%` }}
                        />
                    </div>
                    <div className="text-right text-[10px] font-medium text-sky-600">{Math.round(data.progress)}%</div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                className="w-3 h-3 bg-sky-400 border-2 border-white rounded-full translate-y-[2px]"
            />
        </div>
    );
}
