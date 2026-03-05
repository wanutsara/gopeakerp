import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface ObjectiveData {
    id: string;
    title: string;
    description: string | null;
    year: number;
    quarter: number;
    progress: number;
}

export default function ObjectiveNode({ data }: { data: ObjectiveData }) {
    return (
        <div className="bg-white border-2 border-indigo-500 rounded-2xl shadow-lg w-72 flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 text-white">
                <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Company Objective</div>
                <div className="text-lg font-bold leading-tight line-clamp-2">{data.title}</div>
            </div>
            <div className="p-4 bg-white flex flex-col gap-3">
                {data.description && <p className="text-xs text-gray-500 line-clamp-2">{data.description}</p>}

                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-600">Company Progress</span>
                        <span className="text-indigo-600">{Math.round(data.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, Math.min(100, data.progress))}%` }}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                    <span>{data.year} Q{data.quarter}</span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                className="w-3 h-3 bg-indigo-500 border-2 border-white rounded-full translate-y-[2px]"
            />
        </div>
    );
}
